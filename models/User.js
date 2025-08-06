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

// Virtual field to link Worker to User
userSchema.virtual('worker', {
  ref: 'Worker', // Reference the Worker model
  localField: '_id', // Match User._id
  foreignField: 'user', // With Worker.user
  justOne: true, // Each user has one Worker document
});

// Enable virtuals in toJSON and toObject
userSchema.set('toObject', { virtuals: true });
userSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('User', userSchema);