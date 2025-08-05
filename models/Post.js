// models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
  type: String,
  required: true,
  // enum removed to allow any string
},
  images: [{ type: String }],
  hourlyRate: { 
    type: Number, 
    required: function() { return this.userId.role === 'worker'; }
  },
  availability: { type: Boolean, default: true },
  serviceType: { 
    type: String, 
    enum: ['general', 'specialized', 'emergency', 'long_term'], 
    required: function() { 
      return ['thekadar', 'small_consultant', 'large_consultant'].includes(this.userId.role); 
    }
  },
  projectScale: { 
    type: String, 
    enum: ['small', 'medium', 'large'], 
    required: function() { 
      return ['thekadar', 'small_consultant', 'large_consultant'].includes(this.userId.role); 
    }
  },
  certifications: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

postSchema.pre('save', async function(next) {
  const user = await mongoose.model('User').findById(this.userId);
  this.userId.role = user.role;

  if (user.role === 'worker' && this.hourlyRate == null) {
    return next(new Error('Hourly rate is required for workers'));
  }

  if (['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
    if (!this.serviceType) return next(new Error('Service type is required for thekadar/consultants'));
    if (!this.projectScale) return next(new Error('Project scale is required for thekadar/consultants'));
  }

  next();
});

module.exports = mongoose.model('Post', postSchema);