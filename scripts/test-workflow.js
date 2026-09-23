/**
 * End-to-End Automated Integration Test Suite
 * Tests all core modules, RBAC, business rules, and workflows.
 */
const http = require("http");
const app = require("../src/app");
const { connectDB, disconnectDB } = require("../src/config/db");

let server;
let baseUrl;

// Helper to make JSON HTTP requests
const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let responseBody = "";
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          try {
            const parsed = responseBody ? JSON.parse(responseBody) : {};
            resolve({ status: res.statusCode, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, raw: responseBody });
          }
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log("\n=========================================================");
  console.log("🧪 Starting Automated E2E Workflow Test Suite...");
  console.log("=========================================================\n");

  await connectDB();

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;
  console.log(`[Test Runner] Temporary test server listening on port ${port}\n`);

  let adminToken = "";
  let customerToken = "";
  let createdProductId = "";
  let placedOrderId = "";

  const results = [];
  const assertTest = (testName, condition, details = "") => {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      results.push({ name: testName, status: "PASS" });
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      results.push({ name: testName, status: "FAIL", details });
    }
  };

  try {
    // ─── 1. Health Check ──────────────────────────────────────────────
    console.log("--- 1. Testing System Health Check ---");
    const health = await request("GET", "/api/health");
    assertTest("Health check returns 200 and operational status", health.status === 200 && health.body.success === true);

    // ─── 2. User Authentication ───────────────────────────────────────
    console.log("\n--- 2. Testing Authentication & Registration ---");
    const uniqueSuffix = Date.now();
    const adminEmail = `admin_${uniqueSuffix}@ecommerce.com`;
    const customerEmail = `customer_${uniqueSuffix}@ecommerce.com`;

    // Register Admin
    const regAdmin = await request("POST", "/api/v1/auth/register", {
      name: "Test Admin",
      email: adminEmail,
      password: "AdminPassword123!",
      role: "admin",
    });
    assertTest("Register Admin user returns 201", regAdmin.status === 201 && regAdmin.body.data.user.role === "admin");

    // Login Admin
    const loginAdmin = await request("POST", "/api/v1/auth/login", {
      email: adminEmail,
      password: "AdminPassword123!",
    });
    adminToken = loginAdmin.body.data.token;
    assertTest("Login Admin returns JWT token", loginAdmin.status === 200 && !!adminToken);

    // Register Customer
    const regCustomer = await request("POST", "/api/v1/auth/register", {
      name: "Test Customer",
      email: customerEmail,
      password: "CustomerPassword123!",
      role: "customer",
      address: {
        street: "123 Main St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
      },
    });
    assertTest("Register Customer user returns 201", regCustomer.status === 201 && regCustomer.body.data.user.role === "customer");

    // Login Customer
    const loginCust = await request("POST", "/api/v1/auth/login", {
      email: customerEmail,
      password: "CustomerPassword123!",
    });
    customerToken = loginCust.body.data.token;
    assertTest("Login Customer returns JWT token", loginCust.status === 200 && !!customerToken);

    // Duplicate email registration should fail (409 Conflict)
    const dupReg = await request("POST", "/api/v1/auth/register", {
      name: "Duplicate User",
      email: customerEmail,
      password: "Password123!",
    });
    assertTest("Duplicate email registration returns 409 Conflict", dupReg.status === 409);

    // Current profile check
    const profile = await request("GET", "/api/v1/auth/me", null, customerToken);
    assertTest("GET /auth/me returns customer profile", profile.status === 200 && profile.body.data.user.email === customerEmail);

    // ─── 3. Role-Based Access Control (RBAC) ──────────────────────────
    console.log("\n--- 3. Testing RBAC Access Restrictions ---");

    // Customer tries to create a product -> MUST FAIL (403 Forbidden)
    const custCreate = await request("POST", "/api/v1/products", {
      sku: `PROD-HACK-${uniqueSuffix}`,
      title: "Hacked Product",
      description: "Should not be created",
      price: 10,
      category: "electronics",
      stockQuantity: 10,
    }, customerToken);
    assertTest("Customer creating product returns 403 Forbidden", custCreate.status === 403);

    // Unauthenticated request -> MUST FAIL (401 Unauthorized)
    const unauthCreate = await request("POST", "/api/v1/products", {
      sku: `PROD-UNAUTH-${uniqueSuffix}`,
      title: "Unauth Product",
      description: "Should fail",
      price: 10,
      category: "electronics",
      stockQuantity: 10,
    });
    assertTest("Unauthenticated product creation returns 401 Unauthorized", unauthCreate.status === 401);

    // Admin creates product -> SUCCESS (201 Created)
    const adminCreate = await request("POST", "/api/v1/products", {
      sku: `TEST-SKU-${uniqueSuffix}`,
      title: "Ultra Performance Laptop Stand",
      description: "Ergonomic aluminum laptop stand with dual ventilation fans.",
      price: 49.99,
      category: "accessories",
      stockQuantity: 10,
      minStockThreshold: 3,
    }, adminToken);
    assertTest("Admin creating product returns 201 Created", adminCreate.status === 201);
    createdProductId = adminCreate.body.data.product._id;

    // ─── 4. Product Catalog, Search & Filtering ───────────────────────
    console.log("\n--- 4. Testing Product Catalog, Search & Filtering ---");
    const getCatalog = await request("GET", "/api/v1/products?category=accessories&search=Laptop");
    assertTest("Public product search and filter returns matches", getCatalog.status === 200 && getCatalog.body.data.products.length >= 1);

    const getById = await request("GET", `/api/v1/products/${createdProductId}`);
    assertTest("GET product by ID returns product details", getById.status === 200 && getById.body.data.product.title === "Ultra Performance Laptop Stand");

    // ─── 5. Cart Management & Stock Validation ────────────────────────
    console.log("\n--- 5. Testing Cart Flow & Business Rules ---");

    // Add 2 items to cart
    const addCart = await request("POST", "/api/v1/cart/items", {
      productId: createdProductId,
      quantity: 2,
    }, customerToken);
    assertTest("Customer adds 2 units to cart (Returns 200)", addCart.status === 200 && addCart.body.data.cart.totalItems === 2);

    // Attempt to add more than available stock (current stock is 10, in cart is 2, requesting 15 more) -> MUST FAIL (400 Bad Request)
    const overStock = await request("POST", "/api/v1/cart/items", {
      productId: createdProductId,
      quantity: 15,
    }, customerToken);
    assertTest("Adding quantity exceeding available stock returns 400 Bad Request", overStock.status === 400);

    // View Cart
    const viewCart = await request("GET", "/api/v1/cart", null, customerToken);
    assertTest("GET cart returns subtotal: 99.98 (49.99 x 2)", viewCart.status === 200 && viewCart.body.data.cart.subtotal === 99.98);

    // ─── 6. Checkout Workflow & Inventory Deduction ───────────────────
    console.log("\n--- 6. Testing Checkout Workflow & Stock Deduction ---");
    const checkoutRes = await request("POST", "/api/v1/orders/checkout", {
      shippingAddress: {
        street: "123 Main St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        country: "US",
      },
      paymentMethod: "CREDIT_CARD",
    }, customerToken);

    assertTest("Checkout cart returns 201 Created with orderNumber", checkoutRes.status === 201 && !!checkoutRes.body.data.order.orderNumber);
    placedOrderId = checkoutRes.body.data.order._id;

    // Verify user's cart is now empty
    const emptyCart = await request("GET", "/api/v1/cart", null, customerToken);
    assertTest("Cart is cleared after checkout", emptyCart.status === 200 && emptyCart.body.data.cart.items.length === 0);

    // Verify product stock was decremented from 10 down to 8
    const updatedProd = await request("GET", `/api/v1/products/${createdProductId}`);
    assertTest("Product stock decremented from 10 to 8", updatedProd.status === 200 && updatedProd.body.data.product.stockQuantity === 8);

    // ─── 7. Inventory Audit Trail & Admin Adjustments ─────────────────
    console.log("\n--- 7. Testing Inventory Audit Trail & Adjustments ---");

    // Admin checks audit logs for the product
    const auditLogs = await request("GET", `/api/v1/inventory/audit-logs?productId=${createdProductId}`, null, adminToken);
    const hasSaleAudit = auditLogs.body.data.logs.some((log) => log.type === "SALE" && log.quantityChange === -2);
    assertTest("InventoryAudit contains SALE entry with quantityChange -2", auditLogs.status === 200 && hasSaleAudit);

    // Admin manually restocks +5 units
    const adjustStock = await request("POST", `/api/v1/inventory/adjust/${createdProductId}`, {
      quantityChange: 5,
      reason: "Emergency warehouse supplier shipment",
    }, adminToken);
    assertTest("Admin adjusts stock by +5 (New stock: 13)", adjustStock.status === 200 && adjustStock.body.data.product.currentStock === 13);

    // ─── 8. Order Status Transition & Cancellation Rollback ───────────
    console.log("\n--- 8. Testing Order Lifecycle & Cancellation Stock Rollback ---");

    // Admin transitions order to PROCESSING
    const statusUpdate = await request("PUT", `/api/v1/orders/${placedOrderId}/status`, {
      orderStatus: "PROCESSING",
      note: "Packaging order in warehouse",
    }, adminToken);
    assertTest("Admin updates order status to PROCESSING", statusUpdate.status === 200 && statusUpdate.body.data.order.orderStatus === "PROCESSING");

    // Customer cancels order (Allowed while PROCESSING)
    const cancelOrder = await request("POST", `/api/v1/orders/${placedOrderId}/cancel`, {
      reason: "Customer changed mind before dispatch",
    }, customerToken);
    assertTest("Customer cancels order (Returns 200 CANCELLED)", cancelOrder.status === 200 && cancelOrder.body.data.order.orderStatus === "CANCELLED");

    // Verify stock was restored (+2 back from 13 to 15)
    const restoredProd = await request("GET", `/api/v1/products/${createdProductId}`);
    assertTest("Product stock restored upon cancellation (13 + 2 = 15)", restoredProd.status === 200 && restoredProd.body.data.product.stockQuantity === 15);

    // Verify cancellation audit log recorded
    const cancelAudit = await request("GET", `/api/v1/inventory/audit-logs?productId=${createdProductId}&type=CANCELLATION_RESTORE`, null, adminToken);
    assertTest("InventoryAudit contains CANCELLATION_RESTORE record", cancelAudit.status === 200 && cancelAudit.body.data.logs.length >= 1);

    // Verify invalid transition from CANCELLED state (must fail)
    const invalidTransition = await request("PUT", `/api/v1/orders/${placedOrderId}/status`, {
      orderStatus: "SHIPPED",
    }, adminToken);
    assertTest("Transitioning already CANCELLED order returns 400 Bad Request", invalidTransition.status === 400);

    // ─── Summary ──────────────────────────────────────────────────────
    console.log("\n=========================================================");
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`Test Execution Finished: ${passed} Passed, ${failed} Failed`);
    console.log("=========================================================\n");

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error("❌ Unexpected test runner error:", err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await disconnectDB();
  }
};

runTests();
