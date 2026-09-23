const { body, param } = require("express-validator");

const addToCartValidator = [
  body("productId")
    .notEmpty()
    .withMessage("Product ID is required")
    .isMongoId()
    .withMessage("Invalid Product ID format"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 1 })
    .withMessage("Quantity must be a positive integer (at least 1)"),
];

const updateCartItemValidator = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid Product ID format"),
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt({ min: 0 })
    .withMessage("Quantity must be a non-negative integer (0 removes the item)"),
];

const removeCartItemValidator = [
  param("productId")
    .isMongoId()
    .withMessage("Invalid Product ID format"),
];

module.exports = {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
};
