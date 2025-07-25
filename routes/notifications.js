// E:\theekadar-api\routes\notifications.js
const express = require('express');
const router = express.Router();
const { getNotifications, markNotificationAsRead } = require('../controllers/notifications');
const auth = require('../middleware/auth');

router.get('/', auth(['client', 'worker', 'admin']), getNotifications);
router.put('/read', auth(['client', 'worker', 'admin']), markNotificationAsRead);

module.exports = router;