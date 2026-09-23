const { body, param } = require("express-validator");

const checkoutValidator = [
  body("shippingAddress")
    .notEmpty()
    .withMessage("Shipping address is required")
    .isObject()
    .withMessage("Shipping address must be an object"),
  body("shippingAddress.street")
    .trim()
    .notEmpty()
    .withMessage("Street is required"),
  body("shippingAddress.city")
    .trim()
    .notEmpty()
    .withMessage("City is required"),
  body("shippingAddress.state")
    .trim()
    .notEmpty()
    .withMessage("State is required"),
  body("shippingAddress.zipCode")
    .trim()
    .notEmpty()
    .withMessage("Zip code is required"),
  body("shippingAddress.country")
    .optional()
    .trim(),
  body("paymentMethod")
    .optional()
    .isIn(["CREDIT_CARD", "PAYPAL", "CASH_ON_DELIVERY", "STRIPE_MOCK"])
    .withMessage("Invalid payment method"),
];

const updateOrderStatusValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Order ID"),
  body("orderStatus")
    .notEmpty()
    .withMessage("Order status is required")
    .isIn(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])
    .withMessage("Invalid order status"),
  body("note")
    .optional()
    .trim(),
];

const cancelOrderValidator = [
  param("id")
    .isMongoId()
    .withMessage("Invalid Order ID"),
  body("reason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Cancellation reason cannot exceed 500 characters"),
];

module.exports = {
  checkoutValidator,
  updateOrderStatusValidator,
  cancelOrderValidator,
};
