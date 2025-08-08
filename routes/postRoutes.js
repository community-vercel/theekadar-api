// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Profile = require('../models/profile');
const Review=require('../models/Review');
const mongoose = require('mongoose');

router.post('/create', authMiddleware, postController.createPost);
router.get('/all', authMiddleware, postController.getAllPosts);

router.get('/top', authMiddleware,postController.getTopPosts);

router.get('/user/:userId', postController.getUserPosts);

router.get('/userpost/:postId',authMiddleware, postController.getPost);
router.put('/:postId', authMiddleware, postController.updatePost);
router.delete('/:postId', authMiddleware, postController.deletePost);

// routes/postRoutes.js (or authRoutes.js, depending on your setup)
// routes/postRoutes.js
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;

    // Validate postId
    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Fetch post with user and profile details
    const post = await Post.findById(postId)
      .populate({
        path: 'userId',
        select: 'name email phone role isVerified createdAt',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'logo skills experience callCount city town address verificationStatus rating',
        },
      });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Fetch reviews for this specific post
    const reviews = await Review.find({ postId });

    // Calculate average rating for the post
    let averageRating = null;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = (totalRating / reviews.length).toFixed(1);
    }

    // Construct response
    const response = {
      _id: post._id,
      title: post.title,
      description: post.description,
      category: post.category,
      images: post.images,
      hourlyRate: post.hourlyRate,
      availability: post.availability,
      serviceType: post.serviceType,
      projectScale: post.projectScale,
      certifications: post.certifications,
      createdAt: post.createdAt,
      rating: averageRating, // Post-specific rating
      user: {
        _id: post.userId._id,
        name: post.userId.name,
        email: post.userId.email,
        phone: post.userId.phone,
        role: post.userId.role,
        isVerified: post.userId.isVerified,
        createdAt: post.userId.createdAt,
        profileImage: post.userId.profile ? post.userId.profile.logo : null,
        profileRating: post.userId.profile ? post.userId.profile.rating : null, // Profile rating (if stored)
        skills: post.userId.profile ? post.userId.profile.skills : null,
        experience: post.userId.profile ? post.userId.profile.experience : null,
        callCount: post.userId.profile ? post.userId.profile.callCount : 0,
        city: post.userId.profile ? post.userId.profile.city : null,
        town: post.userId.profile ? post.userId.profile.town : null,
        address: post.userId.profile ? post.userId.profile.address : null,
        verificationStatus: post.userId.profile ? post.userId.profile.verificationStatus : null,
      },
    };

    res.status(200).json({ message: 'Post details retrieved successfully', post: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find({ category })
      .populate({
        path: 'userId',
        select: 'name email phone role isVerified',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'logo skills experience callCount city town address verificationStatus rating',
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments({ category });

    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      description: post.description,
      category: post.category,
      images: post.images,
      hourlyRate: post.hourlyRate,
      availability: post.availability,
      serviceType: post.serviceType,
      projectScale: post.projectScale,
      certifications: post.certifications,
      createdAt: post.createdAt,
      userId: {
        _id: post.userId._id,
        name: post.userId.name,
        email: post.userId.email,
        phone: post.userId.phone,
        role: post.userId.role,
        isVerified: post.userId.isVerified,
        profileImage: post.userId.profile ? post.userId.profile.logo : null,
        rating: post.userId.profile ? post.userId.profile.rating : null,
        skills: post.userId.profile ? post.userId.profile.skills : null,
        experience: post.userId.profile ? post.userId.profile.experience : null,
        callCount: post.userId.profile ? post.userId.profile.callCount : 0,
        city: post.userId.profile ? post.userId.profile.city : null,
        town: post.userId.profile ? post.userId.profile.town : null,
        address: post.userId.profile ? post.userId.profile.address : null,
        verificationStatus: post.userId.profile ? post.userId.profile.verificationStatus : null,
      },
    }));

    res.status(200).json({
      posts: formattedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;