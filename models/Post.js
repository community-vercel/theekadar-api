// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  images: [{ type: String }],
  hourlyRate: { type: Number },
  availability: { type: Boolean, default: true },
  serviceType: { type: String, enum: ['general', 'specialized', 'emergency', 'long_term'] },
  projectScale: { type: String, enum: ['small', 'medium', 'large'] },
  certifications: [{ type: String }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }], // Add this line

  createdAt: { type: Date, default: Date.now },
});

// Indexes for efficient querying
postSchema.index({ userId: 1 });
postSchema.index({ createdAt: -1 });

postSchema.pre('save', async function(next) {
  try {
    const user = await mongoose.model('User').findById(this.userId);
    
    if (!user) {
      return next(new Error('User not found'));
    }

    // Validate hourly rate for workers
    if (user.role === 'worker' && (this.hourlyRate == null || this.hourlyRate === undefined)) {
      return next(new Error('Hourly rate is required for workers'));
    }

    // Validate service type and project scale for contractors/consultants
    if (['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
      if (!this.serviceType) {
        return next(new Error('Service type is required for thekadar/consultants'));
      }
      if (!this.projectScale) {
        return next(new Error('Project scale is required for thekadar/consultants'));
      }
    }

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Post', postSchema);