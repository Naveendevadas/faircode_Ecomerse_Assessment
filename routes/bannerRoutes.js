const express = require('express');
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  getActiveBanners,
  updateBanner,
  deleteBanner,
} = require('../controllers/bannerController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/superAdminMiddleware');
const { validateBanner } = require('../middleware/validationMiddleware');

// GET /banners/active — public, customers can view
router.get('/active', getActiveBanners);

// GET /banners — superadmin views all
router.get('/', protect, superAdminOnly, getAllBanners);

// POST /banners — superadmin creates
router.post('/', protect, superAdminOnly, createBanner);

// PUT /banners/:id — superadmin updates
router.put('/:id', protect, superAdminOnly, updateBanner);

// DELETE /banners/:id — superadmin deletes
router.delete('/:id', protect, superAdminOnly, deleteBanner);

module.exports = router;