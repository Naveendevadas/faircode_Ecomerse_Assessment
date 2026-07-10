const express = require('express');
const router = express.Router();
const {
  placeOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  updateItemStatus,   // ← NEW
  getOrderById,
  requestCancelOrder,
  getCancellationRequests,
  approveCancelOrder,
  rejectCancelOrder,
  requestItemCancellation,
  approveItemCancellation,
  rejectItemCancellation,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const { validateOrder } = require('../middleware/validationMiddleware');

router.post('/', protect, validateOrder, placeOrder);
router.get('/my-orders', protect, getMyOrders);
router.get('/cancellation-requests', protect, adminOnly, getCancellationRequests);
router.get('/', protect, adminOnly, getAllOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, adminOnly, updateOrderStatus);

// 🔧 NEW: PUT /orders/:orderId/items/:itemId/status — admin updates ONE
// item's own status, independent of the rest of the order.
router.put('/:orderId/items/:itemId/status', protect, adminOnly, updateItemStatus);

router.put('/:id/cancel-request', protect, requestCancelOrder);
router.put('/:id/approve-cancel', protect, adminOnly, approveCancelOrder);
router.put('/:id/reject-cancel', protect, adminOnly, rejectCancelOrder);

router.put('/:orderId/items/:itemId/cancel-request', protect, requestItemCancellation);
router.put('/:orderId/items/:itemId/approve-cancel', protect, adminOnly, approveItemCancellation);
router.put('/:orderId/items/:itemId/reject-cancel', protect, adminOnly, rejectItemCancellation);

module.exports = router;