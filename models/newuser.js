// models/TempUser.js
const mongoose = require('mongoose');

const tempUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
  },
  emailVerificationCode: {
    type: String,
    required: true,
  },
  emailVerificationExpires: {
    type: Date,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 200, // Auto-delete after 1 hour
  },
});

module.exports = mongoose.model('TempUser', tempUserSchema);