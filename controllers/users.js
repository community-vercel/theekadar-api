// E:\theekadar-api\controllers\users.js
const User = require('../models/User');
const { sendNotification } = require('../utils/pusher');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -verificationDocuments');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  const { name, phone, address, location } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;
    user.location = location || user.location;

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyWorker = async (req, res) => {
  const { userId, documentId, status } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || !['worker', 'thekedar'].includes(user.role)) {
      return res.status(404).json({ error: `${user.role || 'User'} not found` });
    }

    const document = user.verificationDocuments.id(documentId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    document.status = status;
    if (status === 'approved') {
      user.isVerified = true;
    } else if (status === 'rejected') {
      user.isVerified = false;
    }

    await user.save();
    await sendNotification(
      userId,
      `Your verification document has been ${status}`,
      'general'
    );
    res.json({ message: `Document ${status} successfully` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPendingVerifications = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { role: 'worker', 'verificationDocuments.status': 'pending' };
    const totalItems = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email verificationDocuments')
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const searchUsersByLocation = async (req, res) => {
  const { lat, lng, maxDistance, role, page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const query = { location: { $exists: true } };
    if (role) {
      query.role = role; // e.g., 'worker' or 'thekedar'
    }
    if (lat && lng && maxDistance) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], parseFloat(maxDistance) / 6378.1], // Convert km to radians
        },
      };
    }

    const totalItems = await User.countDocuments(query);
    const users = await User.find(query)
      .select('name email phone role location')
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: users,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUserProfile, updateUserProfile, verifyWorker, getPendingVerifications, searchUsersByLocation };

