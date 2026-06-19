const express = require('express');
const router = express.Router();
const {
  createRazorpayOrder,
  verifyPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// POST /payment/create-order — create razorpay order
router.post('/create-order', protect, createRazorpayOrder);

// POST /payment/verify — verify razorpay payment
router.post('/verify', protect, verifyPayment);

module.exports = router;