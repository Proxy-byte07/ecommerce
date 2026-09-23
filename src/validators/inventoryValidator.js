const { body, param } = require("express-validator");

const adjustStockValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Product ID"),
  body("quantityChange")
    .notEmpty()
    .withMessage("quantityChange is required")
    .isInt()
    .custom((val) => val !== 0)
    .withMessage("quantityChange must be a non-zero integer (+ for restock, - for deduction)"),
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("A reason for stock adjustment is required")
    .isLength({ min: 3, max: 255 })
    .withMessage("Reason must be between 3 and 255 characters"),
];

module.exports = {
  adjustStockValidator,
};
