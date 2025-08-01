const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skills: [{ type: String, required: true }],
  experience: { type: Number, required: true, min: 0 },
  hourlyRate: { type: Number, required: true, min: 0 },
  availability: { type: Boolean, default: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: false }, // [longitude, latitude]
  },
  documents: [{ type: String }],
  profileImage: { type: String },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

workerSchema.index({ location: '2dsphere' });


module.exports = mongoose.model('Worker', workerSchema);