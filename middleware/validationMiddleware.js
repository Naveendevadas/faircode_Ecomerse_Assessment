const { body, validationResult } = require('express-validator');

// ─── Reusable error checker ────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error(errors.array()[0].msg);
    error.statusCode = 400;
    return next(error);
  }
  return next();
};

// ─── Auth validations ──────────────────────────────────────
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
];

const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Enter a valid email'),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required'),
  // FIX: description is optional — was blocking all product creation
  body('description')
    .optional()
    .trim(),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  body('category')
    .notEmpty().withMessage('Category is required')
    .isMongoId().withMessage('Invalid category'),
  validate,
];

const validateOrder = [
  body('paymentMethod')
    .notEmpty().withMessage('Payment method is required')
    .isIn(['razorpay', 'cod']).withMessage('Payment method must be razorpay or cod'),
  validate,
];

const validateFlashSale = [
  body('title')
    .trim()
    .notEmpty().withMessage('Flash sale title is required'),
  body('products')
    .isArray({ min: 1 }).withMessage('At least one product is required'),
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be a valid date'),
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('End time must be a valid date'),
  validate,
];

const validateBanner = [
  body('title')
    .trim()
    .notEmpty().withMessage('Banner title is required'),
  body('image')
    .trim()
    .notEmpty().withMessage('Banner image is required'),
  validate,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  validateOrder,
  validateFlashSale,
  validateBanner,
};