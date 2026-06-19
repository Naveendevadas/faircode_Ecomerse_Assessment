const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');

// ─── Register ──────────────────────────────────────────────
// POST /auth/register
// Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    const error = new Error('Email already registered');
    error.statusCode = 400;
    throw error;
  }

  // Create user
  const user = await User.create({
    name,
    email,
    password,
    role: 'customer',
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ─── Login ─────────────────────────────────────────────────
// POST /auth/login
// Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  // Check password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Login successful',
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// ─── Get Me ────────────────────────────────────────────────
// GET /auth/me
// Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    user,
  });
});

module.exports = { register, login, getMe };