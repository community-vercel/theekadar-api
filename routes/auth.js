// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post=require('../models/Post');
const Review=require('../models/Review');
const { authMiddleware } = require('../middleware/auth');

const mongoose = require('mongoose');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
// routes/authRoutes.js
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const profile = await Profile.findOne({ userId })
      .populate({
        path: 'userId',
        model: 'User',
        select: 'name email phone role isVerified createdAt',
      });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const response = {
      _id: profile.userId._id,
      name: profile.userId.name,
      email: profile.userId.email,
      phone: profile.userId.phone,
      role: profile.userId.role,
      isVerified: profile.userId.isVerified,
      createdAt: profile.userId.createdAt,
      profileImage: profile.logo || null,
      skills: profile.skills || [],
      experience: profile.experience || 0,
      callCount: profile.callCount || 0,
      city: profile.city || null,
      town: profile.town || null,
      address: profile.address || null,
      verificationStatus: profile.verificationStatus || null,
    };

    res.status(200).json({ message: 'Profile details retrieved successfully', profile: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/client/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user directly
    const user = await User.findById(userId).select(
      'name email phone role isVerified createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Build the response
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage:user.profileImage,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    res
      .status(200)
      .json({ message: 'User details retrieved successfully', user: response });
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
});





module.exports = router;