// routes/users.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const crypto = require('crypto');
const { sendResetEmail } = require('../../utils/email');
const authMiddleware = require('../auth');
const roleMiddleware = require('../role');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// Forgot password - request reset link
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendResetEmail(user.email, resetLink);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password using token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const { password, ...safeUser } = req.user.toObject();
    res.json(safeUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add to favorites
router.post('/favorites/:movieId', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user.favorites.includes(req.params.movieId)) {
      user.favorites.push(req.params.movieId);
      await user.save();
    }
    res.json({ message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove from favorites
router.delete('/favorites/:movieId', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    user.favorites = user.favorites.filter(id => id.toString() !== req.params.movieId);
    await user.save();
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get favorites
router.get('/favorites', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('favorites');
    res.json(user.favorites);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;