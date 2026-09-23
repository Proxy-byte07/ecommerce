const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");
const authenticate = require("../middlewares/authMiddleware");
const validate = require("../middlewares/validateMiddleware");
const {
  addToCartValidator,
  updateCartItemValidator,
  removeCartItemValidator,
} = require("../validators/cartValidator");

// All cart routes require authentication
router.use(authenticate);

router.get("/", cartController.getCart);
router.post("/items", addToCartValidator, validate, cartController.addToCart);
router.put("/items/:productId", updateCartItemValidator, validate, cartController.updateQuantity);
router.delete("/items/:productId", removeCartItemValidator, validate, cartController.removeItem);
router.delete("/", cartController.clearCart);

module.exports = router;
