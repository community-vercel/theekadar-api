// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['client', 'worker', 'thekadar', 'contractor', 'consultant'], 
    required: true 
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Virtual field for Profile
userSchema.virtual('profile', {
  ref: 'Profile',
  localField: '_id',
  foreignField: 'userId',
  justOne: true,
});

// Virtual field for Worker (optional, keep if Worker model is still used)
userSchema.virtual('worker', {
  ref: 'Worker',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

// Enable virtuals in toJSON and toObject
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);