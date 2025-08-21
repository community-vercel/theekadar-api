const admin = require('../config/firebase'); // Adjust path to your Firebase initialization

// utils/fcm.js

// utils/fcm.js

async function sendFCMNotification(fcmToken, title, body) {
  if (!fcmToken) {
    console.warn('No FCM token provided');
    return { success: false, message: 'No FCM token provided' };
  }

  const message = {
    notification: {
      title,
      body,
    },
    android: {
      notification: {
        channel_id: 'com.example.flutter_application_2.notifications', // Match Flutter channel ID
      },
    },
    token: fcmToken,
  };

  try {
    await admin.messaging().send(message);
    console.log('Notification sent successfully to token:', fcmToken);
    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Error sending notification:', error);
    if (error.code === 'messaging/registration-token-not-registered') {
      console.warn('Invalid FCM token:', fcmToken);
      // Optionally, clear invalid token
      await User.findOneAndUpdate({ fcmToken }, { fcmToken: null });
    }
    return { success: false, message: `Failed to send notification: ${error.message}` };
  }
}

module.exports = { sendFCMNotification };