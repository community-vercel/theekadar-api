// routes/users.js
const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  verifyWorker,
  getPendingVerifications,
  searchUsersByLocation,
  getAllUsers,
  deleteUser,
  updateUserByAdmin,
  bulkDeleteUser,
  bulkUpdateUser,
  login
} = require('../controllers/adminusers');
const { validate, updateUserSchemas } = require('../middleware/validation');
const admin = require('../middleware/admin');



const User = require('../models/User');
const Verification = require('../models/Verification');
const Profile = require('../models/profile');



const { sendFCMNotification } = require('../utils/fcm');
const admins = require('../config/firebase');



router.get('/profile', admin(['client', 'worker', 'admin']), getUserProfile);
router.put('/profile', admin(['client', 'worker', 'admin']), validate(updateUserSchemas), updateUserProfile);
router.post('/verify-worker', admin(['admin']), verifyWorker);
router.get('/pending-verifications', admin(['admin']), getPendingVerifications);
router.get('/search', admin(['client', 'admin', 'thekedar']), searchUsersByLocation);
router.get('/all', admin(['admin']), getAllUsers);
router.post('/bulk-delete', admin(['admin']), bulkDeleteUser);
router.post('/bulk-update', admin(['admin']), bulkUpdateUser);
router.delete('/:userId', admin(['admin']), deleteUser);
router.put('/:userId', admin(['admin']), validate(updateUserSchemas), updateUserByAdmin);
router.post('/login', login);

router.get('/analytics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersByRole,
      usersByVerification,
      registrationTrends,
      usersByCity,
      usersBySkill,
      avgExperienceByRole,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),

      // Users by role
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $project: { role: '$_id', count: 1, _id: 0 } },
        { $sort: { role: 1 } },
      ]),

      // Users by verification status - now from Verification model only
      Verification.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { status: '$_id', count: 1, _id: 0 } },
        { $sort: { status: 1 } },
      ]),

      // Registration trends (last 30 days)
      User.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),

      // Users by city
      Profile.aggregate([
        { $match: { city: { $exists: true, $ne: null } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $project: { city: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Users by skill (non-client roles)
      Profile.aggregate([
        { $match: { skills: { $exists: true, $ne: [] } } },
        { $unwind: '$skills' },
        { $group: { _id: '$skills', count: { $sum: 1 } } },
        { $project: { skill: '$_id', count: 1, _id: 0 } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Average experience per role
      User.aggregate([
        {
          $match: { role: { $in: ['worker', 'thekadar', 'contractor', 'consultant'] } },
        },
        {
          $lookup: {
            from: 'profiles',
            localField: '_id',
            foreignField: 'userId',
            as: 'profile',
          },
        },
        { $unwind: '$profile' },
        {
          $group: {
            _id: '$role',
            avgExperience: { $avg: '$profile.experience' },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            role: '$_id',
            avgExperience: { $round: ['$avgExperience', 2] },
            count: 1,
            _id: 0,
          },
        },
        { $sort: { role: 1 } },
      ]),
    ]);

    // Ensure all dates in the last 30 days are included
    const dateMap = new Map(registrationTrends.map((item) => [item.date, item.count]));
    const allDates = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      allDates.push({ date: dateStr, count: dateMap.get(dateStr) || 0 });
    }

    res.json({
      totalUsers,
      usersByRole: usersByRole.length ? usersByRole : [{ role: 'No Data', count: 0 }],
      usersByVerification: usersByVerification.length ? usersByVerification : [{ status: 'No Data', count: 0 }],
      registrationTrends: allDates,
      usersByCity: usersByCity.length ? usersByCity : [{ city: 'No Data', count: 0 }],
      usersBySkill: usersBySkill.length ? usersBySkill : [{ skill: 'No Data', count: 0 }],
      avgExperienceByRole: avgExperienceByRole.length ? avgExperienceByRole : [{ role: 'No Data', avgExperience: 0, count: 0 }],
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});



// Send notification to all users
router.post('/broadcast-notification', admin(['admin']), async (req, res) => {
  try {
    const { title, body, type = 'general' } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    // Get all users with FCM tokens
    const users = await User.find({ 
      fcmToken: { $exists: true, $ne: null, $ne: '' } 
    }).select('fcmToken name email');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users with FCM tokens found'
      });
    }

    const fcmTokens = users.map(user => user.fcmToken);
    
    // Prepare the message for multicast
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type,
        timestamp: new Date().toISOString(),
      },
      android: {
        notification: {
          channel_id: 'com.example.flutter_application_2.notifications',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            badge: 1,
            sound: 'default',
          },
        },
      },
      tokens: fcmTokens,
    };

    // Send multicast message
    const response = await admins.messaging().sendEachForMulticast(message);

    // Handle failed tokens
    const failedTokens = [];
    const invalidTokens = [];
    
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push({
          token: fcmTokens[idx],
          error: resp.error?.message || 'Unknown error'
        });

        // If token is invalid, mark for cleanup
        if (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(fcmTokens[idx]);
        }
      }
    });

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $unset: { fcmToken: "" } }
      );
    }

    res.json({
      success: true,
      message: 'Broadcast notification sent',
      stats: {
        totalUsers: users.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokensRemoved: invalidTokens.length
      },
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined
    });

  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast notification',
      error: error.message
    });
  }
});

// Send notification to specific user roles
router.post('/broadcast-by-role',  admin(['admin']), async (req, res) => {
  try {
    const { title, body, roles, type = 'role-specific' } = req.body;

    if (!title || !body || !roles || !Array.isArray(roles)) {
      return res.status(400).json({
        success: false,
        message: 'Title, body, and roles array are required'
      });
    }

    const validRoles = ['client', 'worker', 'thekadar', 'contractor', 'consultant'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid roles: ${invalidRoles.join(', ')}`
      });
    }

    // Get users with specified roles and FCM tokens
    const users = await User.find({ 
      role: { $in: roles },
      fcmToken: { $exists: true, $ne: null, $ne: '' } 
    }).select('fcmToken name role');

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found with specified roles and FCM tokens'
      });
    }

    const fcmTokens = users.map(user => user.fcmToken);
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        type,
        targetRoles: roles.join(','),
        timestamp: new Date().toISOString(),
      },
      android: {
        notification: {
          channel_id: 'com.example.flutter_application_2.notifications',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            badge: 1,
            sound: 'default',
          },
        },
      },
      tokens: fcmTokens,
    };

    const response = await admins.messaging().sendEachForMulticast(message);

    // Handle failed tokens
    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        if (resp.error?.code === 'messaging/registration-token-not-registered' ||
            resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(fcmTokens[idx]);
        }
      }
    });

    // Clean up invalid tokens
    if (invalidTokens.length > 0) {
      await User.updateMany(
        { fcmToken: { $in: invalidTokens } },
        { $unset: { fcmToken: "" } }
      );
    }

    res.json({
      success: true,
      message: `Notification sent to ${roles.join(', ')} users`,
      stats: {
        targetRoles: roles,
        totalUsers: users.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokensRemoved: invalidTokens.length
      }
    });

  } catch (error) {
    console.error('Role-based broadcast error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send role-based notification',
      error: error.message
    });
  }
});

// Get broadcast statistics
router.get('/broadcast-stats',  admin(['admin']), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithFCM = await User.countDocuments({ 
      fcmToken: { $exists: true, $ne: null, $ne: '' } 
    });
    
    const roleStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          total: { $sum: 1 },
          withFCM: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $ne: ['$fcmToken', null] },
                    { $ne: ['$fcmToken', ''] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        usersWithFCM,
        usersWithoutFCM: totalUsers - usersWithFCM,
        fcmCoverage: totalUsers > 0 ? ((usersWithFCM / totalUsers) * 100).toFixed(2) + '%' : '0%',
        roleBreakdown: roleStats
      }
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get broadcast statistics',
      error: error.message
    });
  }
});


module.exports = router;