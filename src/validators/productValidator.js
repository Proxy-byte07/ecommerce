const { body, query, param } = require("express-validator");

const createProductValidator = [
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("Product SKU is required")
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage("SKU can only contain letters, numbers, hyphens, and underscores"),
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 120 })
    .withMessage("Title must be between 3 and 120 characters"),
  body("description")
    .trim()
    .notEmpty()
    .withMessage("Description is required")
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("price")
    .notEmpty()
    .withMessage("Price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required"),
  body("stockQuantity")
    .notEmpty()
    .withMessage("Stock quantity is required")
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be a non-negative integer"),
  body("minStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Threshold must be a non-negative integer"),
  body("status")
    .optional()
    .isIn(["active", "archived"])
    .withMessage("Status must be either 'active' or 'archived'"),
  body("images")
    .optional()
    .isArray()
    .withMessage("Images must be an array of URLs"),
  body("tags")
    .optional()
    .isArray()
    .withMessage("Tags must be an array of strings"),
];

const updateProductValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Product ID format"),
  body("sku")
    .optional()
    .trim()
    .matches(/^[A-Za-z0-9-_]+$/)
    .withMessage("SKU can only contain letters, numbers, hyphens, and underscores"),
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 120 })
    .withMessage("Title must be between 3 and 120 characters"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Description cannot exceed 2000 characters"),
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("category")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Category cannot be empty"),
  body("stockQuantity")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be a non-negative integer"),
  body("minStockThreshold")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Threshold must be a non-negative integer"),
  body("status")
    .optional()
    .isIn(["active", "archived"])
    .withMessage("Status must be either 'active' or 'archived'"),
];

const getProductsQueryValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be an integer >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice must be >= 0"),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice must be >= 0"),
  query("inStock")
    .optional()
    .isBoolean()
    .withMessage("inStock must be true or false"),
  query("sortBy")
    .optional()
    .isIn(["price_asc", "price_desc", "newest", "oldest", "title", "stock"])
    .withMessage("Invalid sortBy option"),
];

const mongoIdParamValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid ID format"),
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  getProductsQueryValidator,
  mongoIdParamValidator,
};
