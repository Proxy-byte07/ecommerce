const Product = require("../models/Product");
const InventoryAudit = require("../models/InventoryAudit");
const AppError = require("../utils/appError");

/**
 * Create a new product (Admin only)
 */
const createProduct = async (productData, adminUserId) => {
  const existingSku = await Product.findOne({
    sku: productData.sku.toUpperCase(),
  });
  if (existingSku) {
    throw new AppError(`A product with SKU '${productData.sku.toUpperCase()}' already exists.`, 409);
  }

  const product = await Product.create({
    ...productData,
    sku: productData.sku.toUpperCase(),
  });

  // If initial stock is greater than 0, record initial audit log
  if (product.stockQuantity > 0) {
    await InventoryAudit.create({
      product: product._id,
      sku: product.sku,
      type: "RESTOCK",
      quantityChange: product.stockQuantity,
      previousStock: 0,
      newStock: product.stockQuantity,
      performedBy: adminUserId || null,
      reason: "Initial inventory setup on product creation",
    });
  }

  return product;
};

/**
 * Retrieve products with filtering, search, sorting, and pagination
 */
const getProducts = async (queryParams) => {
  const {
    page = 1,
    limit = 10,
    search,
    category,
    minPrice,
    maxPrice,
    inStock,
    status = "active",
    sortBy = "newest",
  } = queryParams;

  const filter = {};

  // Status filter (defaults to active unless admin requests all/archived)
  if (status && status !== "all") {
    filter.status = status;
  }

  // Category filter
  if (category) {
    filter.category = category.toLowerCase().trim();
  }

  // Price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = Number(minPrice);
    if (maxPrice !== undefined) filter.price.$lte = Number(maxPrice);
  }

  // Stock availability filter
  if (inStock === true || inStock === "true") {
    filter.stockQuantity = { $gt: 0 };
  } else if (inStock === false || inStock === "false") {
    filter.stockQuantity = 0;
  }

  // Search keyword across title, description, and SKU
  if (search && search.trim() !== "") {
    filter.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
      { sku: { $regex: search.trim().toUpperCase(), $options: "i" } },
      { category: { $regex: search.trim(), $options: "i" } },
    ];
  }

  // Sorting
  const sortOptions = {};
  switch (sortBy) {
    case "price_asc":
      sortOptions.price = 1;
      break;
    case "price_desc":
      sortOptions.price = -1;
      break;
    case "oldest":
      sortOptions.createdAt = 1;
      break;
    case "title":
      sortOptions.title = 1;
      break;
    case "stock":
      sortOptions.stockQuantity = -1;
      break;
    case "newest":
    default:
      sortOptions.createdAt = -1;
      break;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [products, totalCount] = await Promise.all([
    Product.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
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
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    },
  };
};

/**
 * Get product by ID
 */
const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    throw new AppError("Product not found.", 404);
  }
  return product;
};

/**
 * Update an existing product (Admin only)
 */
const updateProduct = async (id, updateData) => {
  // If SKU is being updated, verify uniqueness
  if (updateData.sku) {
    const existing = await Product.findOne({
      sku: updateData.sku.toUpperCase(),
      _id: { $ne: id },
    });
    if (existing) {
      throw new AppError(`A product with SKU '${updateData.sku.toUpperCase()}' already exists.`, 409);
    }
    updateData.sku = updateData.sku.toUpperCase();
  }

  const product = await Product.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};

/**
 * Soft delete (archive) product
 */
const archiveProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { status: "archived" },
    { new: true }
  );

  if (!product) {
    throw new AppError("Product not found.", 404);
  }

  return product;
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  archiveProduct,
};
