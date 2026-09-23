const Product = require("../models/Product");
const InventoryAudit = require("../models/InventoryAudit");
const AppError = require("../utils/appError");

/**
 * Adjust stock quantity manually (Admin only)
 */
const adjustStock = async (productId, quantityChange, reason, adminUserId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  const previousStock = product.stockQuantity;
  const newStock = previousStock + quantityChange;

  if (newStock < 0) {
    throw new AppError(
      `Cannot adjust stock by ${quantityChange}. Current stock is ${previousStock}, which would result in negative inventory (${newStock}).`,
      400
    );
  }

  // Update product stock
  product.stockQuantity = newStock;
  await product.save();

  // Determine audit log type
  const type = quantityChange > 0 ? "RESTOCK" : "MANUAL_ADJUSTMENT";

  // Create audit trail record
  const audit = await InventoryAudit.create({
    product: product._id,
    sku: product.sku,
    type,
    quantityChange,
    previousStock,
    newStock,
    performedBy: adminUserId,
    reason,
  });

  return {
    product: {
      id: product._id,
      sku: product.sku,
      title: product.title,
      previousStock,
      currentStock: product.stockQuantity,
      minStockThreshold: product.minStockThreshold,
      isLowStock: product.isLowStock,
    },
    audit,
  };
};

/**
 * Get products that have fallen below their minimum stock threshold
 */
const getLowStockProducts = async ({ page = 1, limit = 20 }) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const filter = {
    status: "active",
    $expr: { $lte: ["$stockQuantity", "$minStockThreshold"] },
  };

  const [products, totalCount] = await Promise.all([
    Product.find(filter)
      .sort({ stockQuantity: 1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    products,
    meta: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

/**
 * Get immutable inventory audit log history
 */
const getInventoryAuditLogs = async (queryParams) => {
  const {
    productId,
    type,
    page = 1,
    limit = 20,
  } = queryParams;

  const filter = {};
  if (productId) filter.product = productId;
  if (type) filter.type = type;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, totalCount] = await Promise.all([
    InventoryAudit.find(filter)
      .populate("performedBy", "name email role")
      .populate("product", "title sku price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    InventoryAudit.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    logs,
    meta: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

module.exports = {
  adjustStock,
  getLowStockProducts,
  getInventoryAuditLogs,
};
