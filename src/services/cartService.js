const Cart = require("../models/Cart");
const Product = require("../models/Product");
const AppError = require("../utils/appError");

/**
 * Get or create cart for user
 */
const getCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate({
    path: "items.product",
    select: "title sku price stockQuantity status images",
  });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }

  return cart;
};

/**
 * Add an item to user's cart with live stock check
 */
const addToCart = async (userId, { productId, quantity }) => {
  const product = await Product.findById(productId);
  if (!product || product.status !== "active") {
    throw new AppError("Product not found or unavailable.", 404);
  }

  if (product.stockQuantity <= 0) {
    throw new AppError(`'${product.title}' is currently out of stock.`, 400);
  }

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  const existingQuantity = existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
  const newTotalQuantity = existingQuantity + quantity;

  // Business rule: Carted quantity cannot exceed available stock
  if (newTotalQuantity > product.stockQuantity) {
    throw new AppError(
      `Cannot add ${quantity} item(s) to cart. You already have ${existingQuantity} in cart, and only ${product.stockQuantity} are available in stock.`,
      400
    );
  }

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].quantity = newTotalQuantity;
    cart.items[existingItemIndex].priceAtAddition = product.price;
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      priceAtAddition: product.price,
    });
  }

  await cart.save();

  return getCart(userId);
};

/**
 * Update quantity of a specific cart item
 */
const updateCartItemQuantity = async (userId, productId, quantity) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError("Cart not found.", 404);
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new AppError("Item not found in cart.", 404);
  }

  // If quantity is 0, remove the item
  if (quantity === 0) {
    cart.items.splice(itemIndex, 1);
    await cart.save();
    return getCart(userId);
  }

  // Check product stock availability
  const product = await Product.findById(productId);
  if (!product || product.status !== "active") {
    throw new AppError("Product is no longer available.", 404);
  }

  if (quantity > product.stockQuantity) {
    throw new AppError(
      `Requested quantity (${quantity}) exceeds available stock (${product.stockQuantity}) for '${product.title}'.`,
      400
    );
  }

  cart.items[itemIndex].quantity = quantity;
  cart.items[itemIndex].priceAtAddition = product.price;
  await cart.save();

  return getCart(userId);
};

/**
 * Remove an item completely from cart
 */
const removeFromCart = async (userId, productId) => {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new AppError("Cart not found.", 404);
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId.toString()
  );

  if (cart.items.length === initialLength) {
    throw new AppError("Product not found in cart.", 404);
  }

  await cart.save();

  return getCart(userId);
};

/**
 * Clear all items from user cart
 */
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }
  return { items: [], totalItems: 0, subtotal: 0 };
};

module.exports = {
  getCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
};
