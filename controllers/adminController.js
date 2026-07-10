const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({ success: true, user });
});

// POST /admin/create-admin — Superadmin only
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  const admin = await User.create({
    name,
    email,
    password,
    role: 'admin',
  });

  res.status(201).json({
    success: true,
    message: 'Admin created successfully',
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!['customer', 'admin', 'superadmin'].includes(role)) {
    const error = new Error('Invalid role');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'superadmin' && role !== 'superadmin') {
    const error = new Error('Cannot change superadmin role');
    error.statusCode = 403;
    throw error;
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    message: `User role updated to ${role}`,
    user: updatedUser,
  });
});

const deleteAdmin = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role === 'superadmin') {
    const error = new Error('Cannot delete superadmin');
    error.statusCode = 403;
    throw error;
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

module.exports = {
  getAllUsers,
  getUserById,
  createAdmin,
  deleteAdmin,
  updateUserRole,
};