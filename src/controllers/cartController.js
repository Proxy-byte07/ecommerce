const cartService = require("../services/cartService");
const ApiResponse = require("../utils/apiResponse");

/**
 * Get current user's shopping cart
 * GET /api/v1/cart
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getCart(req.user._id);
    return ApiResponse.success(res, 200, "Cart retrieved", { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * Add item to cart
 * POST /api/v1/cart/items
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addToCart(req.user._id, {
      productId,
      quantity: Number(quantity),
    });

    return ApiResponse.success(res, 200, "Item added to cart", { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quantity of item in cart
 * PUT /api/v1/cart/items/:productId
 */
const updateQuantity = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const cart = await cartService.updateCartItemQuantity(
      req.user._id,
      req.params.productId,
      Number(quantity)
    );

    return ApiResponse.success(res, 200, "Cart item updated", { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove an item from cart
 * DELETE /api/v1/cart/items/:productId
 */
const removeItem = async (req, res, next) => {
  try {
    const cart = await cartService.removeFromCart(req.user._id, req.params.productId);
    return ApiResponse.success(res, 200, "Item removed from cart", { cart });
  } catch (error) {
    next(error);
  }
};

/**
 * Clear entire cart
 * DELETE /api/v1/cart
 */
const clearCart = async (req, res, next) => {
  try {
    const result = await cartService.clearCart(req.user._id);
    return ApiResponse.success(res, 200, "Cart cleared", result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateQuantity,
  removeItem,
  clearCart,
};
