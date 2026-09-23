const orderService = require("../services/orderService");
const ApiResponse = require("../utils/apiResponse");

/**
 * Checkout user cart to place an order
 * POST /api/v1/orders/checkout
 */
const checkout = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;
    const order = await orderService.checkout(req.user._id, {
      shippingAddress,
      paymentMethod,
    });

    return ApiResponse.success(
      res,
      201,
      "Order placed successfully and inventory updated",
      { order }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get logged in customer's orders
 * GET /api/v1/orders/my-orders
 */
const getMyOrders = async (req, res, next) => {
  try {
    const result = await orderService.getOrdersForUser(req.user._id, req.query);
    return ApiResponse.success(
      res,
      200,
      "Your orders retrieved",
      { orders: result.orders },
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders across the system (Admin only)
 * GET /api/v1/orders
 */
const getAllOrders = async (req, res, next) => {
  try {
    const result = await orderService.getAllOrders(req.query);
    return ApiResponse.success(
      res,
      200,
      "All orders retrieved",
      { orders: result.orders },
      result.meta
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 * GET /api/v1/orders/:id
 */
const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user);
    return ApiResponse.success(res, 200, "Order details retrieved", { order });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin only)
 * PUT /api/v1/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, note } = req.body;
    const order = await orderService.updateOrderStatus(
      req.params.id,
      orderStatus,
      note,
      req.user
    );

    return ApiResponse.success(
      res,
      200,
      `Order status updated to '${orderStatus}'`,
      { order }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order and restore inventory
 * POST /api/v1/orders/:id/cancel
 */
const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const order = await orderService.cancelOrder(
      req.params.id,
      reason,
      req.user
    );

    return ApiResponse.success(
      res,
      200,
      "Order cancelled successfully and inventory restored",
      { order }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
};
