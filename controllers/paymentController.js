const crypto = require('crypto');
const asyncHandler = require('../utils/asyncHandler');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Address = require('../models/Address');
const { buildOrderFromCart } = require('../utils/orderBuilder');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /payment/create-order — Private
const createRazorpayOrder = asyncHandler(async (req, res) => {
  // 🔧 FIX: this used to trust `req.body.amount` from the client, which is
  // exactly how a discount could go "missing" at payment time — if the
  // frontend ever sent the wrong number (bug, stale state, or someone just
  // editing the request), Razorpay would charge that instead of the real
  // total. The amount is now computed the same way verifyPayment computes
  // it — straight from the DB cart using each product's effective (flash
  // sale-aware) price — so what gets charged always matches what gets
  // saved as the order's total.
  const { totalAmount } = await buildOrderFromCart(req.user._id);

  if (!totalAmount || totalAmount <= 0) {
    const error = new Error('Cart total is invalid');
    error.statusCode = 400;
    throw error;
  }

  const order = await razorpay.orders.create({
    amount:   Math.round(totalAmount * 100), // paise
    currency: 'INR',
    receipt:  `receipt_${Date.now()}`,
  });

  res.status(200).json({ success: true, order, totalAmount });
});

// POST /payment/verify — Private
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderData } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    const error = new Error('Payment details missing');
    error.statusCode = 400;
    throw error;
  }

  // ── Validate address ────────────────────────────────────────────────
  // The address itself isn't stored in the cart, so unlike products/price
  // (which are rebuilt server-side below), it has to come from the client.
  // We still verify it actually belongs to this user before trusting it.
  const address = orderData?.address;
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

  // 1. Verify signature — payment is genuinely authorized by Razorpay
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    const error = new Error('Payment verification failed');
    error.statusCode = 400;
    throw error;
  }

  // 2. Rebuild the order from the DB cart — never trust product/price data
  //    sent from the client. 🔧 FIX: this now goes through buildOrderFromCart,
  //    which prices each item using its EFFECTIVE price (flash sale salePrice
  //    when active, normal price otherwise), so the amount actually charged
  //    by Razorpay (computed identically in createRazorpayOrder) matches the
  //    amount recorded on the order.
  const { cart, orderProducts, totalAmount } = await buildOrderFromCart(req.user._id);

  // 3. Atomic stock deduction — identical pattern to placeOrder.
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

  // 4. Create the order using server-computed data, not client-supplied data
  const order = await Order.create({
    userId:            req.user._id,
    products:          orderProducts,
    address:           addressDoc._id,
    totalAmount,
    paymentMethod:     'razorpay',
    paymentStatus:     'paid',
    orderStatus:       'processing',
    razorpayOrderId,
    razorpayPaymentId,
  });

  // 5. Clear the cart server-side so it's guaranteed to happen with the order
  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: 'Payment verified successfully',
    order,
  });
});

module.exports = { createRazorpayOrder, verifyPayment };