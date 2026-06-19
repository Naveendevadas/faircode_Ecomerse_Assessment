const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const { validateProduct } = require('../middleware/validationMiddleware');

// GET /products
router.get('/', getAllProducts);

// GET /products/:id
router.get('/:id', getProductById);

// POST /products — admin only
router.post('/', protect, adminOnly, validateProduct, addProduct);

// PUT /products/:id — admin only
router.put('/:id', protect, adminOnly, validateProduct, updateProduct);

// DELETE /products/:id — admin only
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;