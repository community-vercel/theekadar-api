// E:\theekadar-api\controllers\notifications.js
const Alert = require('../models/Alert');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.body;

  try {
    const notification = await Alert.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    notification.read = true;
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getNotifications, markNotificationAsRead };