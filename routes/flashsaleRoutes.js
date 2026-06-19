const express = require('express');
const router = express.Router();
const {
  createFlashSale,
  getAllFlashSales,
  getActiveFlashSales,
  getFlashSaleById,
  updateFlashSale,
  deleteFlashSale,
} = require('../controllers/flashSaleController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/superAdminMiddleware');
const { validateFlashSale } = require('../middleware/validationMiddleware');

// GET /flashsale/active — public, customers can view
router.get('/active', getActiveFlashSales);

// GET /flashsale — superadmin views all
router.get('/', protect, superAdminOnly, getAllFlashSales);

// GET /flashsale/:id
router.get('/:id', protect, superAdminOnly, getFlashSaleById);

// POST /flashsale — superadmin creates
router.post('/', protect, superAdminOnly, validateFlashSale, createFlashSale);

// PUT /flashsale/:id — superadmin updates
router.put('/:id', protect, superAdminOnly, validateFlashSale, updateFlashSale);

// DELETE /flashsale/:id — superadmin deletes
router.delete('/:id', protect, superAdminOnly, deleteFlashSale);

module.exports = router;