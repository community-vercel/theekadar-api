
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'completed', 'cancelled'], default: 'pending' },
  scheduledTime: Date,
  duration: Number, // in hours
  totalPrice: Number,
  createdAt: { type: Date, default: Date.now },
});