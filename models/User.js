const mongoose = require('mongoose');
const profile = require('./profile');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['client', 'worker', 'thekadar', 'contractor', 'consultant','admin'], 
    required: true 
  },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  resetPasswordCode: { type: String },
  resetPasswordVerified: { type: Boolean, default: false } // ✅ Added
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
