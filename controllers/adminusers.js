const Profile = require('../models/profile');
const Verification = require('../models/Verification');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

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
    const profile = await Profile.findOne({ userId: req.user.id }).populate('userId', 'email role isVerified');
    if (!profile) return res.status(404).json({ message: 'Profile not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

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

exports.verifyWorker = async (req, res) => {
  try {
    const { userId, status } = req.body;
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'client') {
      return res.status(400).json({ message: 'Verification not applicable for client role' });
    }
    const verification = await Verification.findOneAndUpdate(
      { userId },
      { status, updatedAt: Date.now() },
      { new: true, upsert: true, lean: true }
    );
    const profile = await Profile.findOneAndUpdate(
      { userId },
      { verificationStatus: status },
      { new: true, lean: true }
    );
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found for user' });
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerified: status === 'approved' },
      { new: true, lean: true }
    );
    res.json({
      message: `Worker ${status} successfully`,
      user: updatedUser,
      profile,
      verification,
    });
  } catch (error) {
    console.error('Error verifying worker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({ status: 'pending' }).populate('userId', 'email');
    res.json(verifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.searchUsersByLocation = async (req, res) => {
  try {
    const { city, town } = req.query;
    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (town) query.town = new RegExp(town, 'i');

    const profiles = await Profile.find(query).populate('userId', 'email role isVerified');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (page - 1) * pageSize;

    const users = await User.find({ role: { $ne: 'admin' } })
      .select('email role isVerified createdAt')
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalPages = Math.ceil(totalUsers / pageSize);

    const userIds = users.map((user) => user._id);
    const profiles = await Profile.find({ userId: { $in: userIds } })
      .populate('userId', 'email role isVerified')
      .lean();
    const verifications = await Verification.find({ userId: { $in: userIds } })
      .populate('userId', 'email')
      .lean();

    res.json({
      users,
      profiles,
      verifications,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findByIdAndDelete(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await Profile.findOneAndDelete({ userId }).lean();
    await Verification.findOneAndDelete({ userId }).lean();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user
exports.updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      email,
      role,
      isVerified,
      name,
      phone,
      city,
      town,
      address,
      experience,
      skills,
      features,
      verificationStatus,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: userId } }).lean();
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const validRoles = ['client', 'worker', 'admin', 'thekedar', 'contractor', 'consultant'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (verificationStatus && !validStatuses.includes(verificationStatus)) {
      return res.status(400).json({ message: `Invalid verification status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const currentRole = user.role;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { email, role, isVerified: isVerified ?? false },
      { new: true, runValidators: true, lean: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    let profile = null;
    if (role !== 'client') {
      if (!name || !city || !town || !experience) {
        return res.status(400).json({ message: 'Name, city, town, and experience are required for non-client roles' });
      }
      profile = await Profile.findOneAndUpdate(
        { userId },
        {
          name,
          phone,
          city,
          town,
          address,
          experience,
          skills: skills || [],
          features: features || [],
          verificationStatus: verificationStatus || 'pending',
        },
        { new: true, runValidators: true, upsert: true, lean: true }
      );
    } else {
      await Profile.findOneAndDelete({ userId }).lean();
    }

    if (verificationStatus && role !== 'client') {
      await Verification.findOneAndUpdate(
        { userId },
        { status: verificationStatus, updatedAt: Date.now() },
        { new: true, upsert: true, lean: true }
      );
    } else if (role === 'client' || currentRole === 'client') {
      await Verification.findOneAndDelete({ userId }).lean();
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser,
      profile: role !== 'client' ? profile : null,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

