const Order = require('../models/Order');
const Product = require('../models/Product');
const Address = require('../models/Address');
const asyncHandler = require('../utils/asyncHandler');
const { buildOrderFromCart } = require('../utils/orderBuilder');

// POST /orders — Private
const placeOrder = asyncHandler(async (req, res) => {
  const { paymentMethod, razorpayOrderId, razorpayPaymentId, address } = req.body;

  if (paymentMethod === 'razorpay' && (!razorpayOrderId || !razorpayPaymentId)) {
    const error = new Error('Payment information missing');
    error.statusCode = 400;
    throw error;
  }

  if (!address) {
    const error = new Error('Delivery address is required');
    error.statusCode = 400;
    throw error;
  }

  const addressDoc = await Address.findOne({ _id: address, user: req.user._id });
  if (!addressDoc) {
    const error = new Error('Invalid delivery address');
    error.statusCode = 400;
    throw error;
  }

  const { cart, orderProducts, totalAmount } = await buildOrderFromCart(req.user._id);

  // Atomic stock deduction
  for (const item of orderProducts) {
    const updated = await Product.findOneAndUpdate(
      { _id: item.product, quantity: { $gte: item.quantity } },
      { $inc: { quantity: -item.quantity } },
      { new: true }
    );

    if (!updated) {
      const error = new Error(`${item.name} just went out of stock`);
      error.statusCode = 400;
      throw error;
    }

    const correctStatus = updated.quantity > 0 ? 'In Stock' : 'Out Of Stock';
    if (updated.status !== correctStatus) {
      updated.status = correctStatus;
      await updated.save();
    }
  }

  // 🔧 NEW: give every item its own initial orderStatus/paymentStatus,
  // matching what the order overall starts as, so each product has a
  // status to update independently from day one.
  const initialItemPaymentStatus = paymentMethod === 'razorpay' ? 'paid' : 'pending';
  const itemsWithStatus = orderProducts.map((item) => ({
    ...item,
    orderStatus: 'processing',
    paymentStatus: initialItemPaymentStatus,
  }));

  const order = await Order.create({
    userId: req.user._id,
    products: itemsWithStatus,
    address: addressDoc._id,
    totalAmount,
    paymentMethod,
    paymentStatus: initialItemPaymentStatus,
    razorpayOrderId: razorpayOrderId || '',
    razorpayPaymentId: razorpayPaymentId || '',
  });

  cart.items = [];
  await cart.save();

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    order,
  });
});

// GET /orders/my-orders — Private
const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate('products.product', 'name images')
    .populate('address')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// GET /orders — Admin only
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find()
    .populate('userId', 'name email')
    .populate('products.product', 'name images')
    .populate('address')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

// GET /orders/:id — Private
const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('userId', 'name email')
    .populate('products.product', 'name images')
    .populate('address');

  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (
    req.user.role === 'customer' &&
    order.userId._id.toString() !== req.user._id.toString()
  ) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  res.status(200).json({ success: true, order });
});

// PUT /orders/:id/status — Admin only (overall order-level, kept for
// backward compatibility / bulk updates)
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (orderStatus) order.orderStatus = orderStatus;
  if (paymentStatus) order.paymentStatus = paymentStatus;

  await order.save();

  res.status(200).json({ success: true, message: 'Order status updated', order });
});

// 🔧 NEW: PUT /orders/:orderId/items/:itemId/status — Admin only
// Updates a SINGLE item's orderStatus/paymentStatus without touching any
// other item in the order, or the order-level fields.
const updateItemStatus = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { orderStatus, paymentStatus } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const item = order.products.find((p) => p.product.toString() === itemId);
  if (!item) {
    const error = new Error('Item not found in this order');
    error.statusCode = 404;
    throw error;
  }

  if (orderStatus) item.orderStatus = orderStatus;
  if (paymentStatus) item.paymentStatus = paymentStatus;

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Item status updated',
    order,
  });
});

// ─── Whole-order cancellation request flow ─────────────────────────────

const requestCancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findById(req.params.id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (order.userId.toString() !== req.user._id.toString()) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  if (order.orderStatus !== 'processing') {
    const error = new Error('Only orders that are still processing can be cancelled');
    error.statusCode = 400;
    throw error;
  }

  if (order.cancellationRequested) {
    const error = new Error('Cancellation already requested for this order');
    error.statusCode = 400;
    throw error;
  }

  order.cancellationRequested = true;
  order.cancellationReason = reason || '';
  order.cancellationRequestedAt = new Date();
  order.cancellationDecision = null;

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Cancellation request submitted. An admin will review it shortly.',
    order,
  });
});

const getCancellationRequests = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [
      { cancellationRequested: true },
      { 'products.cancellationRequested': true },
    ],
    orderStatus: { $ne: 'cancelled' },
  })
    .populate('userId', 'name email')
    .populate('products.product', 'name images')
    .populate('address')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: orders.length, orders });
});

const approveCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (!order.cancellationRequested) {
    const error = new Error('This order has no pending cancellation request');
    error.statusCode = 400;
    throw error;
  }

  for (const item of order.products) {
    const product = await Product.findById(item.product);
    if (product) {
      product.quantity += item.quantity;
      await product.save();
    }
  }

  const wasPaidOnline = order.paymentMethod === 'razorpay' && order.paymentStatus === 'paid';

  order.orderStatus = 'cancelled';
  order.cancellationRequested = false;
  order.cancellationDecision = 'approved';
  order.paymentStatus = wasPaidOnline ? 'refunded' : 'failed';

  // 🔧 FIX: update each item's OWN orderStatus/paymentStatus too, since
  // those are now the per-product source of truth shown in the UI.
  order.products.forEach((item) => {
    item.orderStatus = 'cancelled';
    item.paymentStatus = wasPaidOnline ? 'refunded' : 'failed';
  });

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Order cancellation approved',
    order,
  });
});

const rejectCancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (!order.cancellationRequested) {
    const error = new Error('This order has no pending cancellation request');
    error.statusCode = 400;
    throw error;
  }

  order.cancellationRequested = false;
  order.cancellationDecision = 'rejected';

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Cancellation request rejected',
    order,
  });
});

// ─── Per-item cancellation request flow ────────────────────────────────

const requestItemCancellation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { reason } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  if (order.userId.toString() !== req.user._id.toString()) {
    const error = new Error('Not authorized');
    error.statusCode = 403;
    throw error;
  }

  if (order.orderStatus !== 'processing') {
    const error = new Error('Only orders that are still processing can be cancelled');
    error.statusCode = 400;
    throw error;
  }

  const item = order.products.find((p) => p.product.toString() === itemId);
  if (!item) {
    const error = new Error('Item not found in this order');
    error.statusCode = 404;
    throw error;
  }

  if (item.cancellationRequested) {
    const error = new Error('Cancellation already requested for this item');
    error.statusCode = 400;
    throw error;
  }

  item.cancellationRequested = true;
  item.cancellationReason = reason || '';
  item.cancellationRequestedAt = new Date();
  item.cancellationDecision = null;

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Cancellation request submitted for this item. An admin will review it shortly.',
    order,
  });
});

const approveItemCancellation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const item = order.products.find((p) => p.product.toString() === itemId);
  if (!item) {
    const error = new Error('Item not found in this order');
    error.statusCode = 404;
    throw error;
  }

  if (!item.cancellationRequested) {
    const error = new Error('This item has no pending cancellation request');
    error.statusCode = 400;
    throw error;
  }

  const product = await Product.findById(item.product);
  if (product) {
    product.quantity += item.quantity;
    if (product.status === 'Out Of Stock' && product.quantity > 0) {
      product.status = 'In Stock';
    }
    await product.save();
  }

  const wasPaidOnline = order.paymentMethod === 'razorpay' && order.paymentStatus === 'paid';

  order.totalAmount -= item.price * item.quantity;

  item.cancellationRequested = false;
  item.cancellationDecision = 'approved';

  // 🔧 FIX: this is now the real per-item status shown in the UI — set
  // directly, instead of the old standalone `refundStatus` field.
  item.orderStatus = 'cancelled';
  item.paymentStatus = wasPaidOnline ? 'refunded' : 'failed';

  // Order-level fields still reflect the OVERALL order only once every
  // item has been cancelled — unchanged from before.
  const allCancelled = order.products.every((p) => p.cancellationDecision === 'approved');
  if (allCancelled) {
    order.orderStatus = 'cancelled';
    order.paymentStatus = wasPaidOnline ? 'refunded' : 'failed';
  }

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Item cancellation approved',
    order,
  });
});

const rejectItemCancellation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;

  const order = await Order.findById(orderId);
  if (!order) {
    const error = new Error('Order not found');
    error.statusCode = 404;
    throw error;
  }

  const item = order.products.find((p) => p.product.toString() === itemId);
  if (!item) {
    const error = new Error('Item not found in this order');
    error.statusCode = 404;
    throw error;
  }

  if (!item.cancellationRequested) {
    const error = new Error('This item has no pending cancellation request');
    error.statusCode = 400;
    throw error;
  }

  item.cancellationRequested = false;
  item.cancellationDecision = 'rejected';

  await order.save();

  res.status(200).json({
    success: true,
    message: 'Item cancellation request rejected',
    order,
  });
});

module.exports = {
  placeOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateItemStatus,          // ← NEW
  requestCancelOrder,
  getCancellationRequests,
  approveCancelOrder,
  rejectCancelOrder,
  requestItemCancellation,
  approveItemCancellation,
  rejectItemCancellation,
};