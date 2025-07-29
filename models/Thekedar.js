const mongoose = require('mongoose');

const thekedarSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyName: { type: String, required: true },
  experience: { type: Number, required: true, min: 0 },
  workers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
  certifications: [{ type: String }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: false }, // [longitude, latitude]
  },
  profileImage: { type: String },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

thekedarSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Thekedar', thekedarSchema);

