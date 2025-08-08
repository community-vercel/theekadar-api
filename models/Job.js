// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['plumbing', 'electrical', 'carpentry', 'painting', 'construction', 'consulting', 'other'], 
    required: true 
  },
  budget: { type: Number, required: true, min: 0 },
  location: {
    city: { type: String, required: true },
    town: { type: String, required: true },
    address: { type: String },
  },
  status: { 
    type: String, 
    enum: ['open', 'in_progress', 'completed', 'cancelled'], 
    default: 'open' 
  },
  skillsRequired: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
jobSchema.index({ userId: 1 });
jobSchema.index({ category: 1 });
jobSchema.index({ 'location.city': 1, 'location.town': 1 });
jobSchema.index({ status: 1 });

// Update updatedAt on save
jobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual field for User
jobSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

jobSchema.set('toObject', { virtuals: true });
jobSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);