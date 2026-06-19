const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// All cart routes are protected — must be logged in

// GET /cart
router.get('/', protect, getCart);

// POST /cart
router.post('/', protect, addToCart);

// PUT /cart/:productId
router.put('/:productId', protect, updateCartItem);

// DELETE /cart/:productId
router.delete('/:productId', protect, removeFromCart);

// DELETE /cart
router.delete('/', protect, clearCart);

module.exports = router;