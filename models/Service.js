const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  category: { 
    type: String, 
    enum: ['plumber', 'driver', 'consultant', 'electrician', 'other'], 
    required: true 
  },
  description: { 
    type: String, 
    required: true // Added required for better data integrity
  },
  hourlyRate: { 
    type: Number, 
    required: true, // Added required
    min: 0 // Ensure non-negative rates
  },
  availability: [{
    day: { 
      type: String, 
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] // Added enum for validation
    },
    startTime: { 
      type: String, 
      required: true // e.g., "09:00"
    },
    endTime: { 
      type: String, 
      required: true // e.g., "17:00"
    },
  }],
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], // [longitude, latitude]
      required: true 
    },
  },
  ratings: [{
    clientId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    rating: { 
      type: Number, 
      min: 1, 
      max: 5, 
      required: true 
    },
    review: { 
      type: String 
    },
    createdAt: { 
      type: Date, 
      default: Date.now 
    },
  }],
  averageRating: { 
    type: Number, 
    default: 0, 
    min: 0, 
    max: 5 
  },
});

// Create 2dsphere index for geospatial queries
serviceSchema.index({ location: '2dsphere' });

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;