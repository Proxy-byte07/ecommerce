const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const InventoryAudit = require("../models/InventoryAudit");
const AppError = require("../utils/appError");
const { generateOrderNumber } = require("../utils/orderNumber");

/**
 * Valid order status transitions map
 */
const VALID_TRANSITIONS = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Checkout user's cart into a confirmed order
 */
const checkout = async (userId, { shippingAddress, paymentMethod = "CREDIT_CARD" }) => {
  // 1. Fetch user's cart
  const cart = await Cart.findOne({ user: userId }).populate("items.product");

  if (!cart || cart.items.length === 0) {
    throw new AppError("Your cart is empty. Add products before checking out.", 400);
  }

  // 2. Validate current stock availability for every item
  for (const item of cart.items) {
    const product = item.product;
    if (!product || product.status !== "active") {
      throw new AppError(
        `Product '${item.product ? item.product.title : "Unknown"}' is no longer active or available.`,
        400
      );
    }
    if (product.stockQuantity < item.quantity) {
      throw new AppError(
        `Insufficient stock for '${product.title}'. Requested: ${item.quantity}, Available: ${product.stockQuantity}. Please adjust your cart.`,
        400
      );
    }
  }

  const orderNumber = generateOrderNumber();
  const orderLineItems = [];
  let calculatedTotal = 0;

  // 3. Atomically decrement stock and log inventory audit
  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    const previousStock = product.stockQuantity;
    const newStock = previousStock - item.quantity;

    if (newStock < 0) {
      throw new AppError(`Stock race condition: insufficient inventory for '${product.title}'.`, 400);
    }

    product.stockQuantity = newStock;
    await product.save();

    // Log SALE audit
    await InventoryAudit.create({
      product: product._id,
      sku: product.sku,
      type: "SALE",
      quantityChange: -item.quantity,
      previousStock,
      newStock,
      performedBy: userId,
      referenceId: orderNumber,
      reason: `Order placed: ${orderNumber}`,
    });

    const subtotal = Math.round(product.price * item.quantity * 100) / 100;
    calculatedTotal += subtotal;

    orderLineItems.push({
      product: product._id,
      sku: product.sku,
      title: product.title,
      price: product.price,
      quantity: item.quantity,
      subtotal,
    });
  }

  calculatedTotal = Math.round(calculatedTotal * 100) / 100;

  // 4. Create the Order
  const order = await Order.create({
    orderNumber,
    user: userId,
    items: orderLineItems,
    totalAmount: calculatedTotal,
    shippingAddress,
    paymentStatus: "PAID",
    paymentMethod,
    orderStatus: "PENDING",
    statusHistory: [
      {
        status: "PENDING",
        timestamp: new Date(),
        note: "Order placed successfully. Payment confirmed.",
        changedBy: userId,
      },
    ],
  });

  // 5. Clear user's cart
  cart.items = [];
  await cart.save();

  return order;
};

/**
 * Get paginated orders for a customer
 */
const getOrdersForUser = async (userId, queryParams) => {
  const { page = 1, limit = 10, status } = queryParams;

  const filter = { user: userId };
  if (status) filter.orderStatus = status;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Order.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    orders,
    meta: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

/**
 * Get all orders (Admin only)
 */
const getAllOrders = async (queryParams) => {
  const { page = 1, limit = 10, status, userId } = queryParams;

  const filter = {};
  if (status) filter.orderStatus = status;
  if (userId) filter.user = userId;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Order.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    orders,
    meta: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      totalPages,
    },
  };
};

/**
 * Get single order by ID with ownership/admin authorization check
 */
const getOrderById = async (orderId, requestingUser) => {
  const order = await Order.findById(orderId).populate("user", "name email");
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  // Security check: Customer can only view their own orders
  if (
    requestingUser.role !== "admin" &&
    order.user._id.toString() !== requestingUser._id.toString()
  ) {
    throw new AppError("Forbidden: You cannot access orders belonging to another user.", 403);
  }

  return order;
};

/**
 * Update order status (Admin workflow)
 */
const updateOrderStatus = async (orderId, newStatus, note, adminUser) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  const currentStatus = order.orderStatus;

  if (currentStatus === newStatus) {
    throw new AppError(`Order is already in '${newStatus}' status.`, 400);
  }

  const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStatuses.includes(newStatus)) {
    throw new AppError(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed: [${allowedNextStatuses.join(", ")}]`,
      400
    );
  }

  // If transitioning to CANCELLED via status update, restore inventory
  if (newStatus === "CANCELLED") {
    await restoreOrderInventory(order, adminUser._id, note || "Order cancelled by administrator");
    order.cancellationReason = note || "Cancelled by administrator";
  }

  order.orderStatus = newStatus;
  order.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || `Status changed from ${currentStatus} to ${newStatus}`,
    changedBy: adminUser._id,
  });

  await order.save();
  return order;
};

/**
 * Cancel order and automatically restore stock (User or Admin)
 */
const cancelOrder = async (orderId, reason, requestingUser) => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new AppError("Order not found.", 404);
  }

  // Verify ownership if user is customer
  if (
    requestingUser.role !== "admin" &&
    order.user.toString() !== requestingUser._id.toString()
  ) {
    throw new AppError("Forbidden: You can only cancel your own orders.", 403);
  }

  // Business rule: Cannot cancel if order is already shipped, delivered, or cancelled
  if (["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.orderStatus)) {
    throw new AppError(
      `Cannot cancel order because current status is '${order.orderStatus}'. Orders can only be cancelled while PENDING or PROCESSING.`,
      400
    );
  }

  // Restore inventory
  await restoreOrderInventory(
    order,
    requestingUser._id,
    reason || "Order cancelled by customer"
  );

  order.orderStatus = "CANCELLED";
  order.cancellationReason = reason || "Order cancelled by user";
  order.statusHistory.push({
    status: "CANCELLED",
    timestamp: new Date(),
    note: `Cancelled. Reason: ${order.cancellationReason}`,
    changedBy: requestingUser._id,
  });

  await order.save();
  return order;
};

/**
 * Helper: Restore inventory stock and create audit logs upon order cancellation
 */
const restoreOrderInventory = async (order, performedByUserId, reason) => {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      const previousStock = product.stockQuantity;
      const newStock = previousStock + item.quantity;
      product.stockQuantity = newStock;
      await product.save();

      await InventoryAudit.create({
        product: product._id,
        sku: product.sku,
        type: "CANCELLATION_RESTORE",
        quantityChange: item.quantity,
        previousStock,
        newStock,
        performedBy: performedByUserId,
        referenceId: order.orderNumber,
        reason: `Restored from cancellation: ${reason}`,
      });
    }
  }
};

module.exports = {
  checkout,
  getOrdersForUser,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
