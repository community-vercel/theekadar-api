// models/User.js
const mongoose = require('mongoose');
const profile = require('./profile');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows null for phone-only users
    required: function () {
      return !this.phone; // Email required if phone is not provided
    },
  },
  phone: {
    type: String,
    unique: true,
    sparse: true, // Allows null for email-only users
    required: function () {
      return !this.email; // Phone required if email is not provided
    },
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password not required for Google users
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ['client', 'worker', 'thekadar', 'contractor', 'consultant', 'admin'],
    required: true,
  },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  fcmToken: { type: String },
  createdAt: { type: Date, default: Date.now },
  resetPasswordCode: { type: String },
  resetPasswordExpires: { type: Date },
  resetPasswordVerified: { type: Boolean, default: false },
  emailVerificationCode: { type: String }, // For email OTP
  emailVerificationExpires: { type: Date }, // For email OTP
});

// Virtual field for Profile
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);