const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getAllCategoriesAdmin,
  getAllCategoriesWithSubs,
  getCategoryById,
  getSubCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/adminMiddleware');
const {superAdminOnly} = require('../middleware/superAdminMiddleware')

// GET /categories — public, active root categories only (used by storefront)
router.get('/', getAllCategories);

// GET /categories/all — full nested tree (public)
// must be before /:id
router.get('/all', getAllCategoriesWithSubs);

// GET /categories/admin — admin-only, ALL root categories incl. inactive
// must be before /:id
router.get('/admin', protect, adminOnly, getAllCategoriesAdmin);

// GET /categories/:id/subcategories — must be before /:id
router.get('/:id/subcategories', getSubCategories);

// GET /categories/:id
router.get('/:id', getCategoryById);

// ─── Admin only routes ──────────────────────────────────
// POST /categories
router.post('/', protect, superAdminOnly, createCategory);

// PUT /categories/:id
router.put('/:id', protect, superAdminOnly, updateCategory);

// DELETE /categories/:id
router.delete('/:id', protect, superAdminOnly, deleteCategory);

module.exports = router;