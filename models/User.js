// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }, // New field: required
  phone: { type: String, required: true }, // New field: optional
  role: { 
    type: String, 
    enum: ['client', 'worker', 'thekadar', 'contractor', 'consultant'], 
    required: true 
  },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);