// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');


router.post('/create', authMiddleware, profileController.createProfile);
router.post('/update',authMiddleware,profileController.updateProfile);
router.post('/call/:userId', authMiddleware, profileController.incrementCallCount);
router.get('/call/:userId', authMiddleware, profileController.getCallCount);
router.get('/near', authMiddleware, profileController.findProfilesNear); // New endpoint
// GET /api/profile/exists/:userId
router.get('/exists/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if profile exists
    const profileExists = await Profile.exists({ userId });
    
    // Return true if profile exists, false otherwise
    res.json(!!profileExists);
  } catch (error) {
    console.error('Error checking profile existence:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;