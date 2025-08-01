// models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: false }, // [longitude, latitude]
  },
  logo: { type: String },
  skills: [{ type: String }], // For workers
  features: [{ type: String }], // For thekadar, small/large consultants
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  callCount: { type: Number, default: 0 }, // Track call button clicks
});

// Add 2dsphere index for geospatial queries
profileSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Profile', profileSchema);