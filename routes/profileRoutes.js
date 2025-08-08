// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/auth');


router.post('/create', authMiddleware, profileController.createProfile);
router.post('/update',authMiddleware,profileController.updateProfile);
router.post('/call/:userId', authMiddleware, profileController.incrementCallCount);
router.get('/call/:userId', authMiddleware, profileController.getCallCount);
router.get('/near', authMiddleware, profileController.findProfilesNear); // New endpoint

module.exports = router;