// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/User');
const mongoose = require('mongoose');


router.post('/register', authController.register);
router.post('/login', authController.login);
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