// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Profile = require('../models/profile');
router.post('/create', authMiddleware, postController.createPost);
router.get('/all', authMiddleware, postController.getAllPosts);
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
          select: 'logo skills experience callCount city town address verificationStatus',
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments({ category });

    const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      userId: {
        _id: post.userId._id,
        name: post.userId.name,
        email: post.userId.email,
        phone: post.userId.phone,
        role: post.userId.role,
        isVerified: post.userId.isVerified,
        profileImage: post.userId.profile ? post.userId.profile.logo : null,
        rating: post.userId.profile && post.userId.profile.rating ? post.userId.profile.rating : null,
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