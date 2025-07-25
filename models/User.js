
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'worker', 'admin'], default: 'client' },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
  },
  isVerified: { type: Boolean, default: false },
  verificationDocuments: [{
    type: { type: String, enum: ['id_proof', 'certification', 'license'] },
    url: String, // Vercel Blob URL
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    uploadedAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
});