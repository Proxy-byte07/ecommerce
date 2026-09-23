const inventoryService = require("../services/inventoryService");
const ApiResponse = require("../utils/apiResponse");

/**
 * Adjust stock quantity (Admin only)
 * POST /api/v1/inventory/adjust/:id
 */
const adjustStock = async (req, res, next) => {
  try {
    const { quantityChange, reason } = req.body;
    const result = await inventoryService.adjustStock(
      req.params.id,
      Number(quantityChange),
      reason,
      req.user._id
    );

    return ApiResponse.success(
      res,
      200,
      "Inventory stock adjusted successfully",
      result
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get products below low-stock threshold (Admin only)
 * GET /api/v1/inventory/low-stock
 */
const getLowStock = async (req, res, next) => {
  try {
    const result = await inventoryService.getLowStockProducts(req.query);
    return ApiResponse.success(
      res,
      200,
      "Low stock products retrieved",
      { products: result.products },
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get inventory audit logs (Admin only)
 * GET /api/v1/inventory/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const result = await inventoryService.getInventoryAuditLogs(req.query);
    return ApiResponse.success(
      res,
      200,
      "Inventory audit trail retrieved",
      { logs: result.logs },
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adjustStock,
  getLowStock,
  getAuditLogs,
};
