const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const { validateOrder } = require('../middleware/validationMiddleware');

// POST /orders — customer places order
router.post('/', protect, validateOrder, placeOrder);

// GET /orders/my-orders — customer views own orders
router.get('/my-orders', protect, getMyOrders);

// GET /orders — admin views all orders
router.get('/', protect, adminOnly, getAllOrders);

// GET /orders/:id — get single order
router.get('/:id', protect, getOrderById);

// PUT /orders/:id/status — admin updates order status
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

module.exports = router;