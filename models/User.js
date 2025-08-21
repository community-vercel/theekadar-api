const mongoose = require('mongoose');
const profile = require('./profile');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: function() { return !this.googleId; }, // Email not required if googleId exists
    unique: true, 
    sparse: true // Allows null values for Google users
  },
  password: { 
    type: String, 
    required: function() { return !this.googleId; } // Password not required if googleId exists
  },
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true // Allows null values for non-Google users
  },
  name: { type: String, required: true },
  phone: { 
    type: String, 
    required: function() { return !this.googleId; }, // Phone not required if googleId exists
    unique: true, // Ensure no duplicate phone numbers
    sparse: true // Allows null values for Google users with no phone
  },
  role: { 
    type: String, 
    enum: ['client', 'worker', 'thekadar', 'contractor', 'consultant', 'admin'], 
  },
  profileImage: { type: String },
  isVerified: { type: Boolean, default: false },
  fcmToken:  { type: String },
  createdAt: { type: Date, default: Date.now },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  resetPasswordCode: { type: String },
  resetPasswordVerified: { type: Boolean, default: false }
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