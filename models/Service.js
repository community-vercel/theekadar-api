
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['plumber', 'driver', 'consultant', 'electrician', 'other'], required: true },
  description: String,
  hourlyRate: Number,
  availability: [{
    day: String,
    startTime: String,
    endTime: String,
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number], // [longitude, latitude]
  },
  ratings: [{
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    review: String,
    createdAt: { type: Date, default: Date.now },
  }],
  averageRating: { type: Number, default: 0 },
});
serviceSchema.index({ location: '2dsphere' }); // For geospatial queries