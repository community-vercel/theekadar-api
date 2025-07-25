const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  clientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  workerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  serviceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'completed', 'cancelled'], 
    default: 'pending' 
  },
  scheduledTime: { 
    type: Date, 
    required: true // Added required for scheduling
  },
  duration: { 
    type: Number, 
    required: true, // Added required
    min: 0 // Ensure non-negative duration
  },
  totalPrice: { 
    type: Number, 
    required: true, // Added required
    min: 0 // Ensure non-negative price
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

const Booking = mongoose.model('Booking', bookingSchema);
module.exports = Booking;