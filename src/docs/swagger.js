const swaggerUi = require("swagger-ui-express");

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "E-Commerce & Inventory Management API",
    version: "1.0.0",
    description: `
**Intermediate Backend System API**

Features:
- **Authentication & Authorization**: JWT-based stateless tokens, password hashing with bcrypt, role-based access control (Admin & Customer).
- **Product Management**: Full catalog CRUD, categories, price range filters, search, pagination, stock tracking.
- **Inventory Control**: Real-time stock reservation, stock adjustments with audit logging, low-stock threshold queries.
- **Cart & Order Flow**: Live cart stock verification, atomic checkout decrement, cancellation rollbacks, lifecycle state machine.
    `,
  },
  servers: [
    {
      url: "http://localhost:5001",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token in the format: Bearer <token>",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["customer", "admin"] },
          address: {
            type: "object",
            properties: {
              street: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              zipCode: { type: "string" },
              country: { type: "string" },
            },
          },
        },
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          sku: { type: "string", example: "TECH-HEAD-001" },
          title: { type: "string", example: "Wireless Noise Cancelling Headphones" },
          description: { type: "string" },
          price: { type: "number", example: 149.99 },
          category: { type: "string", example: "electronics" },
          stockQuantity: { type: "integer", example: 25 },
          minStockThreshold: { type: "integer", example: 5 },
          status: { type: "string", enum: ["active", "archived"] },
          isInStock: { type: "boolean" },
          isLowStock: { type: "boolean" },
        },
      },
      CartItem: {
        type: "object",
        properties: {
          product: { $ref: "#/components/schemas/Product" },
          quantity: { type: "integer", example: 2 },
          priceAtAddition: { type: "number", example: 149.99 },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          orderNumber: { type: "string", example: "ORD-20260922-A1B2C" },
          user: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product: { type: "string" },
                sku: { type: "string" },
                title: { type: "string" },
                price: { type: "number" },
                quantity: { type: "integer" },
                subtotal: { type: "number" },
              },
            },
          },
          totalAmount: { type: "number", example: 299.98 },
          shippingAddress: { type: "object" },
          paymentStatus: { type: "string", example: "PAID" },
          orderStatus: { type: "string", enum: ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] },
        },
      },
      InventoryAudit: {
        type: "object",
        properties: {
          id: { type: "string" },
          product: { type: "string" },
          sku: { type: "string" },
          type: { type: "string", enum: ["RESTOCK", "SALE", "CANCELLATION_RESTORE", "MANUAL_ADJUSTMENT"] },
          quantityChange: { type: "integer", example: -2 },
          previousStock: { type: "integer", example: 10 },
          newStock: { type: "integer", example: 8 },
          reason: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      StandardSuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation successful" },
          data: { type: "object" },
          meta: { type: "object" },
        },
      },
      StandardErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed or error occurred" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
    },
  },
  paths: {
    "/api/v1/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register new customer or admin",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Jane Doe" },
                  email: { type: "string", example: "jane@example.com" },
                  password: { type: "string", example: "SecurePass123!" },
                  role: { type: "string", enum: ["customer", "admin"], example: "customer" },
                  address: {
                    type: "object",
                    properties: {
                      street: { type: "string", example: "123 Market St" },
                      city: { type: "string", example: "San Francisco" },
                      state: { type: "string", example: "CA" },
                      zipCode: { type: "string", example: "94103" },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          409: { description: "Email already registered" },
        },
      },
    },
    "/api/v1/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login and obtain JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", example: "jane@example.com" },
                  password: { type: "string", example: "SecurePass123!" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Login successful with token" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/api/v1/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current authenticated user profile",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Current user profile" },
          401: { description: "Unauthorized" },
        },
      },
    },
    "/api/v1/products": {
      get: {
        tags: ["Products"],
        summary: "List catalog products with filters, search, and pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "minPrice", in: "query", schema: { type: "number" } },
          { name: "maxPrice", in: "query", schema: { type: "number" } },
          { name: "inStock", in: "query", schema: { type: "boolean" } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["newest", "price_asc", "price_desc", "stock"] } },
        ],
        responses: {
          200: { description: "List of products with pagination metadata" },
        },
      },
      post: {
        tags: ["Products"],
        summary: "Create new product (Admin only)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["sku", "title", "description", "price", "category", "stockQuantity"],
                properties: {
                  sku: { type: "string", example: "PROD-KEY-001" },
                  title: { type: "string", example: "Mechanical Gaming Keyboard" },
                  description: { type: "string", example: "RGB backlit mechanical keyboard with blue switches." },
                  price: { type: "number", example: 89.99 },
                  category: { type: "string", example: "electronics" },
                  stockQuantity: { type: "integer", example: 40 },
                  minStockThreshold: { type: "integer", example: 5 },
                  images: { type: "array", items: { type: "string" } },
                  tags: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Product created" },
          403: { description: "Forbidden - Requires Admin role" },
        },
      },
    },
    "/api/v1/products/{id}": {
      get: {
        tags: ["Products"],
        summary: "Get product details by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Product details" },
          404: { description: "Product not found" },
        },
      },
      put: {
        tags: ["Products"],
        summary: "Update product (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          200: { description: "Product updated" },
          403: { description: "Forbidden" },
        },
      },
      delete: {
        tags: ["Products"],
        summary: "Archive product (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Product archived" },
          403: { description: "Forbidden" },
        },
      },
    },
    "/api/v1/inventory/adjust/{id}": {
      post: {
        tags: ["Inventory"],
        summary: "Manually adjust product stock with audit trail (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantityChange", "reason"],
                properties: {
                  quantityChange: { type: "integer", example: 15, description: "Positive to restock, negative to deduct" },
                  reason: { type: "string", example: "Warehouse shipment restock" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Stock adjusted and audit record created" },
          400: { description: "Adjustment would result in negative stock" },
        },
      },
    },
    "/api/v1/inventory/low-stock": {
      get: {
        tags: ["Inventory"],
        summary: "List products below minimum stock threshold (Admin only)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "List of low stock products" },
        },
      },
    },
    "/api/v1/inventory/audit-logs": {
      get: {
        tags: ["Inventory"],
        summary: "View inventory audit trail history (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "productId", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["RESTOCK", "SALE", "CANCELLATION_RESTORE", "MANUAL_ADJUSTMENT"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        ],
        responses: {
          200: { description: "Paginated audit logs" },
        },
      },
    },
    "/api/v1/cart": {
      get: {
        tags: ["Cart"],
        summary: "Get current user's cart",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Cart contents with item count and subtotal" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear all items from cart",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Cart cleared" },
        },
      },
    },
    "/api/v1/cart/items": {
      post: {
        tags: ["Cart"],
        summary: "Add item to cart (validates against live stock)",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["productId", "quantity"],
                properties: {
                  productId: { type: "string" },
                  quantity: { type: "integer", example: 1 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Item added to cart" },
          400: { description: "Insufficient stock available" },
        },
      },
    },
    "/api/v1/cart/items/{productId}": {
      put: {
        tags: ["Cart"],
        summary: "Update quantity of item in cart",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["quantity"],
                properties: { quantity: { type: "integer", example: 3 } },
              },
            },
          },
        },
        responses: {
          200: { description: "Cart updated" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Remove specific item from cart",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "productId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Item removed" },
        },
      },
    },
    "/api/v1/orders/checkout": {
      post: {
        tags: ["Orders"],
        summary: "Checkout cart: validates stock, atomically decrements inventory, creates order",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["shippingAddress"],
                properties: {
                  shippingAddress: {
                    type: "object",
                    required: ["street", "city", "state", "zipCode"],
                    properties: {
                      street: { type: "string", example: "456 Elm St" },
                      city: { type: "string", example: "Austin" },
                      state: { type: "string", example: "TX" },
                      zipCode: { type: "string", example: "78701" },
                    },
                  },
                  paymentMethod: { type: "string", example: "CREDIT_CARD" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Order created successfully" },
          400: { description: "Empty cart or insufficient stock" },
        },
      },
    },
    "/api/v1/orders/my-orders": {
      get: {
        tags: ["Orders"],
        summary: "List current customer's order history",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Customer orders list" },
        },
      },
    },
    "/api/v1/orders": {
      get: {
        tags: ["Orders"],
        summary: "List all customer orders across system (Admin only)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "All orders list" },
        },
      },
    },
    "/api/v1/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "Get order details by ID (Owner or Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Order details" },
          403: { description: "Cannot access another user's order" },
        },
      },
    },
    "/api/v1/orders/{id}/status": {
      put: {
        tags: ["Orders"],
        summary: "Update order status workflow (Admin only)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderStatus"],
                properties: {
                  orderStatus: { type: "string", enum: ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] },
                  note: { type: "string", example: "Package dispatched via FedEx" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Order status updated" },
        },
      },
    },
    "/api/v1/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel order and restore product stock (Owner or Admin)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string", example: "Changed mind on color" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Order cancelled and stock restored" },
          400: { description: "Cannot cancel already shipped order" },
        },
      },
    },
  },
};

const setupSwagger = (app) => {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: "E-Commerce & Inventory Management API Docs",
    })
  );
  // Also expose raw OpenAPI JSON spec
  app.get("/api/docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerDocument);
  });
};

module.exports = { setupSwagger, swaggerDocument };
