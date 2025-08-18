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
  login
} = require('../controllers/adminusers');
const { validate, updateUserSchemas } = require('../middleware/validation');
const admin = require('../middleware/admin');

const User = require('../models/User');
const Verification = require('../models/Verification');
const Profile = require('../models/profile');

router.get('/profile', admin(['client', 'worker', 'admin']), getUserProfile);
router.put('/profile', admin(['client', 'worker', 'admin']), validate(updateUserSchemas), updateUserProfile);
router.post('/verify-worker', admin(['admin']), verifyWorker);
router.get('/pending-verifications', admin(['admin']), getPendingVerifications);
router.get('/search', admin(['client', 'admin', 'thekedar']), searchUsersByLocation);
router.get('/all', admin(['admin']), getAllUsers);
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

module.exports = router;