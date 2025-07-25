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
  const { name, phone, address } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = address || user.address;

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
    if (!user || user.role !== 'worker') {
      return res.status(404).json({ error: 'Worker not found' });
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
  try {
    const users = await User.find({
      role: 'worker',
      'verificationDocuments.status': 'pending',
    }).select('name email verificationDocuments');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getUserProfile, updateUserProfile, verifyWorker, getPendingVerifications };