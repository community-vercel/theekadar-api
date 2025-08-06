// E:\theekadar-api\routes\users.js
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, verifyWorker, getPendingVerifications,searchUsersByLocation } = require('../controllers/users');
const { validate, updateUserSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

const User = require('../models/User');
const Worker = require('../models/Worker');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


router.get('/profile', auth(['client', 'worker', 'admin']), getUserProfile);
router.put('/profile', auth(['client', 'worker', 'admin']), validate(updateUserSchema), updateUserProfile);
router.post('/verify-worker', auth(['admin']), verifyWorker);
router.get('/pending-verifications', auth(['admin']), getPendingVerifications);
router.get('/search', auth(['client', 'admin', 'thekedar']), searchUsersByLocation);

router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .select('name email phone role isVerified createdAt')
      .populate({
        path: 'worker',
        model: 'Worker',
        select: 'profileImage rating skills experience',
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      profileImage: user.worker ? user.worker.profileImage : null,
      rating: user.worker ? user.worker.rating : null,
      skills: user.worker ? user.worker.skills : null,
      experience: user.worker ? user.worker.experience : null,
    };

    res.status(200).json({ message: 'User details retrieved successfully', user: response });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;