// routes/verificationRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // Memory storage (no disk), works with Vercel Blob
const verificationController = require('../controllers/verificationController');
const { authMiddleware } = require('../middleware/auth');

router.post(
  '/submit',
  authMiddleware,
  upload.single('file'), // 'file' must match the Postman form-data key
  verificationController.submitVerification
);

module.exports = router;
