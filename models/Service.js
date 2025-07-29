const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  thekedarId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  category: { 
    type: String, 
    enum: ['plumber', 'driver', 'consultant', 'electrician', 'other'], 
    required: true 
  },
  description: { type: String, required: true },
  hourlyRate: { type: Number, required: true, min: 0 },
  availability: [{
    day: { 
      type: String, 
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  ratings: [{
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    review: { type: String },
    createdAt: { type: Date, default: Date.now },
  }],
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
});

serviceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Service', serviceSchema);