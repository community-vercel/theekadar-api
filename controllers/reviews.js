// controllers/reviews.js
const Review = require('../models/Review');
const Post = require('../models/Post');
const Profile = require('../models/profile');
const { sendNotification } = require('../utils/pusher');

exports.submitReview = async (req, res) => {
  const { postId, rating, comment } = req.body;

  try {
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Optionally: Check if user has a completed booking (if applicable)
    // This requires a Booking model, which wasn’t provided
    // If not needed, remove this check or implement it based on your requirements

    // Check if user already reviewed this post
    const existingReview = await Review.findOne({ postId, userId: req.user.id });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this post' });
    }

    const review = new Review({
      postId,
      userId: req.user.id,
      rating,
      comment,
    });

    await review.save();

    // Update profile rating
    const userId = post.userId;
    const posts = await Post.find({ userId });
    const postIds = posts.map(post => post._id);
    const reviews = await Review.find({ postId: { $in: postIds } });
    const averageRating = reviews.length > 0 
      ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : null;

    await Profile.findOneAndUpdate(
      { userId },
      { rating: averageRating },
      { new: true }
    );

    await sendNotification(
      userId,
      `New review (${rating}/5) for your post: ${post.title}`,
      'general'
    );

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getReviews = async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const reviews = await Review.find({ postId })
      .populate('userId', 'name email')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Review.countDocuments({ postId });

    res.status(200).json({
      data: reviews,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};