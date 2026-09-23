# E-Commerce & Inventory Management Platform — Backend API

An intermediate-level, production-grade backend system built with **Node.js**, **Express**, **MongoDB/Mongoose**, **JWT Authentication**, and **Role-Based Access Control (RBAC)**.

This project is built as an independent, standalone backend application showcasing a clean **Controller – Service – Model** architecture, transactional workflows (cart & checkout), real-time stock reservation, immutable inventory audit logging, order lifecycle management, interactive **Swagger / OpenAPI** documentation, and **Postman collection**.

---

## Key Highlights & Architectural Strengths

- **Clean Architecture (Controller-Service-Model)**: Controllers handle HTTP transport (request parsing, status codes, standard JSON envelope). Services handle domain business logic and data manipulation. Models encapsulate schema rules and database queries.
- **Authentication & RBAC**: Secure password hashing with bcrypt, stateless JWT tokens, and declarative role guards (`admin` vs `customer`).
- **Real-Time Stock Protection**: Live inventory checking at cart addition and checkout to prevent overselling.
- **Atomic Stock Deduction & Rollback**: Order checkout decrements product stock and records immutable audit records; cancelling an order automatically replenishes stock.
- **Audit Trail**: Every inventory change (`RESTOCK`, `SALE`, `CANCELLATION_RESTORE`, `MANUAL_ADJUSTMENT`) is logged with delta, previous stock, new stock, user, and reason.
- **Interactive Swagger Documentation**: Live API explorer at `/api/docs`.
- **Zero-Config Execution**: Automatically runs with an in-memory MongoDB database if no external MongoDB URI is specified.

---

## Project Structure

```
ecommerce-backend/
├── package.json                      # Standalone dependencies and scripts
├── .env.example                      # Environment variables template
├── .env                              # Development environment configuration
├── server.js                         # HTTP server bootstrap & graceful shutdown
├── README.md                         # Architecture and API documentation
├── scripts/
│   ├── seed.js                       # Populates realistic demo products & users
│   └── test-workflow.js              # Automated E2E integration test suite
└── src/
    ├── app.js                        # Express app, middlewares, docs, route mounting
    ├── config/
    │   ├── db.js                     # MongoDB connection with in-memory fallback
    │   └── env.js                    # Validated environment configuration loader
    ├── controllers/                  # HTTP Request/Response Handlers (Thin layer)
    │   ├── authController.js
    │   ├── productController.js
    │   ├── inventoryController.js
    │   ├── cartController.js
    │   └── orderController.js
    ├── services/                     # Domain Business Logic (Decoupled from HTTP)
    │   ├── authService.js
    │   ├── productService.js
    │   ├── inventoryService.js
    │   ├── cartService.js
    │   └── orderService.js
    ├── models/                       # Mongoose Schemas & Database Entities
    │   ├── User.js                   # Users, bcrypt pre-save hashing, comparePassword
    │   ├── Product.js                # SKU, pricing, stock, categories, search indexes
    │   ├── Cart.js                   # User shopping cart, line items, subtotal virtual
    │   ├── Order.js                  # Orders, immutable line-item snapshot, status history
    │   └── InventoryAudit.js         # Immutable stock modification ledger
    ├── middlewares/                  # Interceptors and guards
    │   ├── authMiddleware.js         # Bearer JWT verification & user attachment
    │   ├── rbacMiddleware.js         # Role-based authorization guard
    │   ├── validateMiddleware.js     # express-validator result formatter
    │   └── errorHandler.js           # Centralized error handler & Mongoose error mapper
    ├── validators/                   # express-validator schema rules
    │   ├── authValidator.js
    │   ├── productValidator.js
    │   ├── cartValidator.js
    │   ├── orderValidator.js
    │   └── inventoryValidator.js
    ├── utils/
    │   ├── apiResponse.js            # Standard response envelope: { success, message, data, meta }
    │   ├── appError.js               # Custom operational error class
    │   └── orderNumber.js            # Human-readable order number generator (ORD-YYYYMMDD-XXXX)
    └── docs/
        ├── swagger.js                # OpenAPI 3.0 specification & Swagger UI mounting
        └── postman_collection.json   # Exported Postman collection with tests & variables
```

---

## Quickstart Guide

### 1. Installation
Navigate into the `ecommerce-backend/` directory:
```bash
cd ecommerce-backend
npm install
```

### 2. Environment Setup
The project works immediately out of the box with zero external dependencies using an automatic in-memory MongoDB server. To connect to an external MongoDB instance or Atlas, create or modify `.env`:
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ecommerce_db # (Optional: leave blank for in-memory)
JWT_SECRET=super_secret_jwt_key_for_ecommerce_app_development_2026
JWT_EXPIRES_IN=7d
```

### 3. Seed Demo Data
Populate realistic catalog products, an Admin user, and a Customer user:
```bash
npm run seed
```

**Default Credentials:**
- **Admin**: `admin@ecommerce.com` / `AdminSecret123!` (Role: `admin`)
- **Customer**: `customer@ecommerce.com` / `CustomerSecret123!` (Role: `customer`)

### 4. Start Server
```bash
npm start
```
- API Base URL: `http://localhost:5001/api/v1`
- **Swagger Documentation UI**: `http://localhost:5001/api/docs`
- Health Check: `http://localhost:5001/api/health`

### 5. Run Automated Tests
Execute the end-to-end integration test suite verifying all modules, RBAC restrictions, cart validations, checkout stock deductions, and cancellation rollbacks:
```bash
npm test
```

---

## Architectural Deep Dive

### 1. Authentication & Authorization (RBAC)
- **Password Security**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with 10 salt rounds inside a Mongoose `pre('save')` hook.
- **Password Masking**: The password field has `select: false` in the schema to ensure it is never inadvertently exposed in queries or JSON serialization.
- **JWT Authentication**: Users receive a signed JSON Web Token upon successful registration or login.
- **Middleware Authentication**: The `authMiddleware.js` extracts the `Bearer <token>` from the `Authorization` header, verifies its integrity and expiration, and checks that the user still exists in the database.
- **Role Guards**: The `rbacMiddleware.js` (`authorize('admin')`) checks `req.user.role` against permitted roles, immediately rejecting unauthorized attempts with a structured `403 Forbidden` response.

### 2. Controller – Service – Model Layering
- **Controllers** (`src/controllers/`): Strictly responsible for HTTP concerns: receiving requests, passing parameters to services, and invoking `ApiResponse.success(res, ...)` or `next(err)`.
- **Services** (`src/services/`): Contain all business logic. They are framework-agnostic, easily testable, and handle multi-step workflows such as cart validation, stock calculations, inventory decrements, and status transitions.
- **Models** (`src/models/`): Mongoose schemas defining fields, data types, indexes, pre-save hooks, and virtual properties (e.g., `isInStock`, `isLowStock`, `subtotal`).

### 3. Business Rule Enforcement & Inventory Management

#### Stock Reservation & Race Condition Prevention
- When an item is added to or updated in the cart, the system validates the requested quantity against the live product stock (`Product.stockQuantity`).
- If a customer attempts to add more items than available, the API rejects the operation with a descriptive `400 Bad Request` explaining available vs. requested stock.

#### Atomic Checkout & Price Snapshotting
During `/api/v1/orders/checkout`:
1. The user's cart is retrieved and populated.
2. Every line item's stock is re-validated against the database to catch changes since the item was added to the cart.
3. For each line item:
   - `Product.stockQuantity` is decremented.
   - An immutable `InventoryAudit` record of type `SALE` is created, recording the delta (`-quantity`), previous stock, new stock, order number reference, and timestamp.
4. An immutable `Order` document is created storing a price snapshot (`price`, `subtotal`, `sku`, `title`) so future product price updates do not retroactively alter historic orders.
5. The user's cart is emptied upon successful order creation.

#### Order Cancellation & Stock Restoration
- If an order is cancelled while in `PENDING` or `PROCESSING` status (via `/api/v1/orders/:id/cancel` or admin status update):
  - The system automatically loops through the order line items and restores the quantities back to `Product.stockQuantity`.
  - An `InventoryAudit` record of type `CANCELLATION_RESTORE` is logged for each item.
  - The order status is transitioned to `CANCELLED`.
- Orders in `SHIPPED` or `DELIVERED` status cannot be cancelled, enforcing realistic e-commerce logistics constraints.

#### State Machine Workflow
Orders follow a strict state transition flow:
```
PENDING ──► PROCESSING ──► SHIPPED ──► DELIVERED
   │             │
   └──────►──────┴────────► CANCELLED (triggers stock restore)
```

---

## API Endpoints Reference

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register customer or admin |
| `POST` | `/api/v1/auth/login` | Public | Login and receive JWT token |
| `GET` | `/api/v1/auth/me` | Authenticated | Get current authenticated user profile |

### Products (`/api/v1/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Public | List products with pagination, search, category & price filters |
| `GET` | `/api/v1/products/:id` | Public | Get product details by ID |
| `POST` | `/api/v1/products` | Admin | Create a new product and log initial inventory |
| `PUT` | `/api/v1/products/:id` | Admin | Update product details |
| `DELETE` | `/api/v1/products/:id` | Admin | Archive/soft-delete product |

### Inventory Management (`/api/v1/inventory`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/inventory/adjust/:id` | Admin | Manually adjust product stock (+ or -) with audit reason |
| `GET` | `/api/v1/inventory/low-stock` | Admin | Query products falling below `minStockThreshold` |
| `GET` | `/api/v1/inventory/audit-logs` | Admin | View immutable inventory history filtered by product or type |

### Shopping Cart (`/api/v1/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/cart` | Authenticated | View current user's shopping cart with computed subtotal |
| `POST` | `/api/v1/cart/items` | Authenticated | Add item to cart (validates against live inventory stock) |
| `PUT` | `/api/v1/cart/items/:productId` | Authenticated | Update item quantity (setting to 0 removes item) |
| `DELETE` | `/api/v1/cart/items/:productId` | Authenticated | Remove specific item from cart |
| `DELETE` | `/api/v1/cart` | Authenticated | Clear entire cart |

### Orders & Checkout (`/api/v1/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/orders/checkout` | Authenticated | Checkout cart, deduct stock, create order, clear cart |
| `GET` | `/api/v1/orders/my-orders` | Authenticated | View current user's order history |
| `GET` | `/api/v1/orders/:id` | Authenticated | View order details (owner or admin) |
| `POST` | `/api/v1/orders/:id/cancel` | Authenticated | Cancel order and automatically restore inventory |
| `GET` | `/api/v1/orders` | Admin | View all orders across the entire system |
| `PUT` | `/api/v1/orders/:id/status` | Admin | Update order status workflow (`PROCESSING`, `SHIPPED`, etc.) |

---

## API Testing

### 1. Swagger UI (Browser)
Visit `http://localhost:5001/api/docs` while the server is running.
- Click **Authorize** at the top right to paste a Bearer token received from `/auth/login`.
- Test every endpoint interactively with full request and response schemas.

### 2. Postman Collection
Import `src/docs/postman_collection.json` into Postman.
- The collection contains pre-configured requests organized by module (`Authentication`, `Products`, `Inventory`, `Cart`, `Orders`).
- Automated test scripts automatically capture the JWT token from login responses and save it into collection variables (`adminToken`, `customerToken`) for seamless execution.

### 3. Automated Test Suite
Run the comprehensive integration test suite:
```bash
npm test
```
This script exercises all 12 major workflows, testing positive paths and asserting proper HTTP 400, 401, 403, and 409 rejection behaviors.
