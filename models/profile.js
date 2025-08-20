const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: false },
  phone: { type: String, required: false },
  city: { type: String, required: true },
  town: { type: String, required: true },
  address: { type: String },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  experience: { type: Number, required: true, min: 0 },
  logo: { type: String },
  skills: [{ type: String }],
  features: [{ type: String }],
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  callCount: { type: Number, default: 0 },
  formattedAddress: { type: String }, // Store formatted address from Google
  placeId: { type: String }, // Store Google Place ID for future reference
});

module.exports = mongoose.model('Profile', profileSchema);