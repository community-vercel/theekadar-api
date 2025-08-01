// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, profileController.createProfile);

module.exports = router;