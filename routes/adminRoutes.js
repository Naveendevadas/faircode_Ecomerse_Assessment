const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createAdmin,
  deleteAdmin,
  updateUserRole,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { superAdminOnly } = require('../middleware/superAdminMiddleware');

// All admin routes — superadmin only

// GET /admin/users — view all users
router.get('/users', protect, superAdminOnly, getAllUsers);

// GET /admin/users/:id — view single user
router.get('/users/:id', protect, superAdminOnly, getUserById);

// POST /admin/create-admin — create new admin
router.post('/create-admin', protect, superAdminOnly, createAdmin);

// PUT /admin/users/:id/role — update user role
router.put('/users/:id/role', protect, superAdminOnly, updateUserRole);

// DELETE /admin/users/:id — delete admin or user
router.delete('/users/:id', protect, superAdminOnly, deleteAdmin);

module.exports = router;