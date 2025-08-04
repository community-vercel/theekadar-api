// routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const verificationController = require('../controllers/verificationController');
const { authMiddleware } = require('../middleware/auth');

// Configure multer
const upload = multer({ storage: multer.memoryStorage() });

router.post('/submit', authMiddleware, upload.single('file'), verificationController.submitVerification);

module.exports = router;