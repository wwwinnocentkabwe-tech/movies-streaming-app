// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const roleMiddleware = require('./Role Middleware');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, email, password: hashedPassword });
  await user.save();
  res.status(201).json({ message: 'User registered' });
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token });
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  res.json(req.user);
});

// Add to favorites
router.post('/favorites/:movieId', authMiddleware, async (req, res) => {
  const user = req.user;
  if (!user.favorites.includes(req.params.movieId)) {
    user.favorites.push(req.params.movieId);
    await user.save();
  }
  res.json({ message: 'Added to favorites' });
});

// Remove from favorites
router.delete('/favorites/:movieId', authMiddleware, async (req, res) => {
  const user = req.user;
  user.favorites = user.favorites.filter(id => id.toString() !== req.params.movieId);
  await user.save();
  res.json({ message: 'Removed from favorites' });
});

// Get favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).populate('favorites');
  res.json(user.favorites);
});

module.exports = router;