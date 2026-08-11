// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
 password: { type: String, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
resetPasswordToken: String,
resetPasswordExpires: Date
});

module.exports = mongoose.model('User', UserSchema);