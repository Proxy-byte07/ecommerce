const express = require("express");
const router = express.Router();

const orderController = require("../controllers/orderController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/rbacMiddleware");
const validate = require("../middlewares/validateMiddleware");
const {
  checkoutValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
} = require("../validators/orderValidator");
const { mongoIdParamValidator } = require("../validators/productValidator");

// All order routes require authentication
router.use(authenticate);

// Customer endpoints
router.post("/checkout", checkoutValidator, validate, orderController.checkout);
router.get("/my-orders", orderController.getMyOrders);
router.post("/:id/cancel", cancelOrderValidator, validate, orderController.cancelOrder);

// Admin-only order list
router.get("/", authorize("admin"), orderController.getAllOrders);

// Order details (Customer can view own order, Admin can view any)
router.get("/:id", mongoIdParamValidator, validate, orderController.getOrderById);

// Update status (Admin workflow)
router.put("/:id/status", authorize("admin"), updateOrderStatusValidator, validate, orderController.updateOrderStatus);

module.exports = router;
