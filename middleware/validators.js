// middleware/validators.js
const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

const validationRules = {
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  password: body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),

  loginPassword: body('password')
    .notEmpty()
    .withMessage('Password is required'),

  username: body('username')
    .isLength({ min: 3 })
    .trim()
    .escape()
    .withMessage('Username must be at least 3 characters'),

  title: body('title')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required'),

  rating: body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5')
};

module.exports = { validationRules, handleValidationErrors };