// controllers/users.js
const Profile = require('../models/profile');
const Verification = require('../models/Verification');
const User = require('../models/User'); // Assuming a User model exists
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Get user profile

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id }).populate('userId', 'email role');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, city, town, address, experience, skills, features } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { name, phone, city, town, address, experience, skills, features },
      { new: true, runValidators: true }
    );
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify worker
exports.verifyWorker = async (req, res) => {
  try {
    const { userId, status } = req.body; // status: 'approved' or 'rejected'
    const verification = await Verification.findOneAndUpdate(
      { userId },
      { status, updatedAt: Date.now() },
      { new: true }
    );
    if (!verification) return res.status(404).json({ message: 'Verification not found' });

    // Update profile verification status
    await Profile.findOneAndUpdate(
      { userId },
      { verificationStatus: status },
      { new: true }
    );

    res.json({ message: `Worker ${status} successfully`, verification });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending verifications
exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({ status: 'pending' }).populate('userId', 'email');
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search users by location
exports.searchUsersByLocation = async (req, res) => {
  try {
    const { city, town } = req.query;
    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (town) query.town = new RegExp(town, 'i');

    const profiles = await Profile.find(query).populate('userId', 'email role');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Get all users (for admin dashboard)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('email role createdAt');
    const profiles = await Profile.find().populate('userId', 'email role');
    res.json({ users, profiles });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// New: Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    await Profile.findOneAndDelete({ userId });
    await Verification.findOneAndDelete({ userId });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};