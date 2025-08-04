// models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: false },
  phone: { type: String,required: false },
  city: { type: String, required: true },
  town: { type: String, required: true },
  address: { type: String },
 experiance: { type: Number, required: true, min: 0 },
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

module.exports = mongoose.model('Profile', profileSchema);