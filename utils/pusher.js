// E:\theekadar-api\utils\pusher.js
const Pusher = require('pusher');

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

const sendNotification = async (userId, message, type) => {
  try {
    await pusher.trigger(`user-${userId}`, 'notification', {
      message,
      type,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Pusher error:', error.message);
  }
};

module.exports = { sendNotification };