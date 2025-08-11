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
router.get('/:userId',authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .select('name email phone role isVerified createdAt')
      .populate({
        path: 'profile',
        model: 'Profile',
        select: 'logo skills experience callCount city town address verificationStatus',
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = {
      _id: user._id || user.userId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      profileImage: user.profile ? user.profile.logo : null,
      skills: user.profile ? user.profile.skills : null,
      experience: user.profile ? user.profile.experience : null,
      callCount: user.profile ? user.profile.callCount : 0,
      city: user.profile ? user.profile.city : null,
      town: user.profile ? user.profile.town : null,
      address: user.profile ? user.profile.address : null,
      verificationStatus: user.profile ? user.profile.verificationStatus : null,
    };

    res.status(200).json({ message: 'User details retrieved successfully', user: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


module.exports = router;