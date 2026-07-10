const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const {
  validateRegister,
  validateLogin,
} = require("../middleware/validationMiddleware");

// Public Routes
router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

// Protected Route
router.get("/me", protect, getMe);

module.exports = router;