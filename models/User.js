const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'worker', 'admin', 'thekedar'], default: 'client' },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: false }, // [longitude, latitude]
  },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [{
    type: { type: String, enum: ['id_proof', 'certification', 'license', 'company_proof'] },
    url: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});

// Create 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('User', userSchema);