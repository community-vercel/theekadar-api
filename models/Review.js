const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  postId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Post', 
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: false, 
    trim: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Add unique index to prevent multiple reviews from the same user for the same post
reviewSchema.index({ postId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);