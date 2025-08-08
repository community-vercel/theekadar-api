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



// routes/postRoutes.js (or authRoutes.js, depending on your setup)
// routes/postRoutes.js
exports.getTopPosts = async (req, res) => {
  try {
    // Aggregate posts with profile and review data
    const posts = await Post.aggregate([
      // Lookup Profile to get callCount and logo
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      // Lookup Reviews to calculate average rating
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      // Project fields and calculate average rating
      {
        $project: {
          _id: 1,
          userId: 1,
          title: 1,
          description: 1,
          category: 1,
          images: 1,
          hourlyRate: 1,
          availability: 1,
          serviceType: 1,
          projectScale: 1,
          certifications: 1,
          createdAt: 1,
          callCount: { $ifNull: ['$profile.callCount', 0] },
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $avg: '$reviews.rating' },
              else: 0,
            },
          },
        },
      },
      // Lookup User for user details
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Project final fields and calculate weighted score
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          images: 1,
          hourlyRate: 1,
          availability: 1,
          serviceType: 1,
          projectScale: 1,
          certifications: 1,
          createdAt: 1,
          callCount: 1,
          averageRating: { $round: ['$averageRating', 1] }, // Round to 1 decimal
          weightedScore: {
            $add: [
              { $multiply: [{ $divide: ['$callCount', 100] }, 0.5] }, // Normalize callCount (max 100)
              { $multiply: ['$averageRating', 0.1] }, // Scale rating (max 5, so 0.1 * 5 = 0.5)
            ],
          },
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            phone: '$user.phone',
            role: '$user.role',
            isVerified: '$user.isVerified',
            createdAt: '$user.createdAt',
          },
          profile: {
            profileImage: '$profile.logo', // Map logo to profileImage
            skills: '$profile.skills',
            experience: '$profile.experience',
            callCount: '$profile.callCount',
            city: '$profile.city',
            town: '$profile.town',
            address: '$profile.address',
            verificationStatus: '$profile.verificationStatus',
          },
        },
      },
      // Sort by weighted score (descending) and limit to 10
      { $sort: { weightedScore: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      message: 'Top 10 posts retrieved successfully',
      data: posts,
    });
  } catch (error) {
    console.error('Get top posts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
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