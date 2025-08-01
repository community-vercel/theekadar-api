const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  logo: { type: String }, // URL from Vercel Blob
  skills: [{ type: String }], // For workers
  features: [{ type: String }], // For thekadar, small/large consultants
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
});

module.exports = mongoose.model('Profile', profileSchema);