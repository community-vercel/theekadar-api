const mongoose = require('mongoose');


const verificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  documentType: { type: String, enum: ['id', 'passport', 'license'], required: true },
  documentUrl: { type: String, required: true }, // URL from Vercel Blob
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Verification', verificationSchema);