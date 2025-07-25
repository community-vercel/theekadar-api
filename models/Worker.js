const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [{ type: String, required: true }], // e.g., ["plumber", "electrician"]
  experience: { type: Number, required: true }, // Years of experience
  hourlyRate: { type: Number, required: true },
  availability: { type: Boolean, default: true },
  location: { type: String, required: true },
  documents: [{ type: String }], // URLs from Vercel Blob
  profileImage: { type: String }, // URL from Vercel Blob
  rating: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Worker', workerSchema);