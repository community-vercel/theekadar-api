// routes/users.js
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, verifyWorker, getPendingVerifications, searchUsersByLocation, getAllUsers, deleteUser,login } = require('../controllers/adminusers');
const { validate, updateUserSchema } = require('../middleware/validation');
const admin = require('../middleware/admin');

router.get('/profile', admin(['client', 'worker', 'admin']), getUserProfile);
router.put('/profile', admin(['client', 'worker', 'admin']), validate(updateUserSchema), updateUserProfile);
router.post('/verify-worker', admin(['admin']), verifyWorker);
router.get('/pending-verifications', admin(['admin']), getPendingVerifications);
router.get('/search', admin(['client', 'admin', 'thekedar']), searchUsersByLocation);
router.get('/all', admin(['admin']), getAllUsers); // New: Get all users
router.delete('/:userId', admin(['admin']), deleteUser); // New: Delete user
router.post('/login', login);

module.exports = router;