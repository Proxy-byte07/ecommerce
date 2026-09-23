const productService = require("../services/productService");
const ApiResponse = require("../utils/apiResponse");

/**
 * Create a new product (Admin)
 * POST /api/v1/products
 */
const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body, req.user._id);
    return ApiResponse.success(res, 201, "Product created successfully", { product });
  } catch (error) {
    next(error);
  }
};

/**
 * List products with filters, search, and pagination (Public)
 * GET /api/v1/products
 */
const getProducts = async (req, res, next) => {
  try {
    const result = await productService.getProducts(req.query);
    return ApiResponse.success(
      res,
      200,
      "Products retrieved successfully",
      { products: result.products },
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by ID (Public)
 * GET /api/v1/products/:id
 */
const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return ApiResponse.success(res, 200, "Product details retrieved", { product });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (Admin)
 * PUT /api/v1/products/:id
 */
const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return ApiResponse.success(res, 200, "Product updated successfully", { product });
  } catch (error) {
    next(error);
  }
};

/**
 * Archive/soft delete product (Admin)
 * DELETE /api/v1/products/:id
 */
const archiveProduct = async (req, res, next) => {
  try {
    const product = await productService.archiveProduct(req.params.id);
    return ApiResponse.success(res, 200, "Product archived successfully", { product });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  archiveProduct,
};
