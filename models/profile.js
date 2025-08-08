// models/Profile.js
const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: false },
  phone: { type: String, required: false },
  city: { type: String, required: true },
  town: { type: String, required: true },
  address: { type: String },
  experience: { type: Number, required: true, min: 0 }, // Fixed typo: 'experiance' → 'experience'
  logo: { type: String },
  skills: [{ type: String }],
  features: [{ type: String }],
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  callCount: { type: Number, default: 0 },
});

// Add 2dsphere index for geospatial queries (if needed)

module.exports = mongoose.model('Profile', profileSchema);