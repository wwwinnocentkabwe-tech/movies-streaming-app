// app.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const app = express();

// ===== SECURITY MIDDLEWARE =====
// Helmet sets various HTTP headers to protect against common vulnerabilities
app.use(helmet());

// CORS with restricted origins in production
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
const storageDir = path.join(__dirname, 'middleware', 'Storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Body parser with size limit to prevent large payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'Storage')));

// ===== INPUT VALIDATION HELPER =====
// Middleware to handle validation errors
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

// ===== EXPORT VALIDATION RULES FOR USE IN ROUTES =====
const validationRules = {
  // Email validation rule
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // Password validation rule (min 8 chars, uppercase, lowercase, number)
  password: body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
  
  // Username validation
  username: body('username')
    .isLength({ min: 3 })
    .trim()
    .escape()
    .withMessage('Username must be at least 3 characters'),
  
  // Movie title validation
  title: body('title')
    .trim()
    .escape()
    .notEmpty()
    .withMessage('Title is required')
};

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// ===== ROUTE SETUP =====
app.use('/api/movies', require('./middleware/routes/movies'));
app.use('/api/users', require('./middleware/routes/users'));

// ===== ERROR HANDLING =====
// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// ===== EXPORT FOR TESTING =====
module.exports = { app, validationRules, handleValidationErrors };