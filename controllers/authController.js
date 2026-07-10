const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

// POST /auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    const error = new Error("Email already registered");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "customer",
  });

  res.status(201).json({
    success: true,
    message: "Registration successful",
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Login successful",
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

// GET /auth/me
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// POST /auth/forgot-password
// POST /auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  // Generate 6-digit OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetPasswordOTP = otp;
  user.resetPasswordOTPExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
  user.resetPasswordVerified = false;
  await user.save({ validateBeforeSave: false }); // skip required-field validation if any

  await sendEmail(
    user.email,
    "Your Password Reset OTP",
    `
      <h2>Password Reset OTP</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 4px;">${otp}</h1>
      <p>This OTP expires in 10 minutes. If you didn't request this, ignore this email.</p>
    `
  );

  res.status(200).json({
    success: true,
    message: "OTP sent to your email",
  });
});

// POST /auth/verify-otp
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordOTP) {
    const error = new Error("Invalid request");
    error.statusCode = 400;
    throw error;
  }

  if (user.resetPasswordOTPExpiry < Date.now()) {
    const error = new Error("OTP has expired");
    error.statusCode = 400;
    throw error;
  }

  if (user.resetPasswordOTP !== otp) {
    const error = new Error("Invalid OTP");
    error.statusCode = 400;
    throw error;
  }

  // Mark as verified so resetPassword can proceed
  user.resetPasswordVerified = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "OTP verified successfully",
  });
});

// POST /auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!user.resetPasswordVerified) {
    const error = new Error("OTP verification required before resetting password");
    error.statusCode = 400;
    throw error;
  }

  if (user.resetPasswordOTPExpiry < Date.now()) {
    const error = new Error("Reset session expired. Please request a new OTP.");
    error.statusCode = 400;
    throw error;
  }

  user.password = password; // hashed by your pre('save') hook
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpiry = null;
  user.resetPasswordVerified = false;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password reset successfully",
  });
});

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};