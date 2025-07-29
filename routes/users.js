// E:\theekadar-api\routes\users.js
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, verifyWorker, getPendingVerifications,searchUsersByLocation } = require('../controllers/users');
const { validate, updateUserSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.get('/profile', auth(['client', 'worker', 'admin']), getUserProfile);
router.put('/profile', auth(['client', 'worker', 'admin']), validate(updateUserSchema), updateUserProfile);
router.post('/verify-worker', auth(['admin']), verifyWorker);
router.get('/pending-verifications', auth(['admin']), getPendingVerifications);
router.get('/search', auth(['client', 'admin', 'thekedar']), searchUsersByLocation);

module.exports = router;