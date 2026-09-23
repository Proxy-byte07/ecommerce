const express = require("express");
const router = express.Router();

const inventoryController = require("../controllers/inventoryController");
const authenticate = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/rbacMiddleware");
const validate = require("../middlewares/validateMiddleware");
const { adjustStockValidator } = require("../validators/inventoryValidator");

// All inventory routes are restricted to Admin role
router.use(authenticate, authorize("admin"));

router.post("/adjust/:id", adjustStockValidator, validate, inventoryController.adjustStock);
router.get("/low-stock", inventoryController.getLowStock);
router.get("/audit-logs", inventoryController.getAuditLogs);

module.exports = router;
