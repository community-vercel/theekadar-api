// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');

router.post('/create', authMiddleware, postController.createPost);
router.get('/all', authMiddleware, postController.getAllPosts);
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Find posts by category and populate user details
    const posts = await Post.find({ category })
      .populate({
        path: 'userId',
        select: 'name email phone role', // Include phone from User model
        populate: {
          path: 'worker',
          model: 'Worker',
          select: 'profileImage rating', // Include profileImage and rating from Worker model
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments({ category });

    // Format the response to ensure worker details are included
    const formattedPosts = posts.map(post => ({
      ...post.toObject(),
      userId: {
        _id: post.userId._id,
        name: post.userId.name,
        email: post.userId.email,
        phone: post.userId.phone,
        role: post.userId.role,
        profileImage: post.userId.worker ? post.userId.worker.profileImage : null,
        rating: post.userId.worker ? post.userId.worker.rating : null,
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