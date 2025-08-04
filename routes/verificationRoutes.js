// routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authMiddleware } = require('../middleware/auth');

router.post('/submit', authMiddleware, verificationController.uploadVerification);
router.get('/status',authMiddleware, verificationController.checkVerificationStatus);

module.exports = router;