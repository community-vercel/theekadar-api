const Profile = require('../models/profile');
const Verification = require('../models/Verification');
const User = require('../models/User');
const Post=require('../models/Post');
const Job=require('../models/Job')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendFCMNotification } = require('../utils/fcm');

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

    const previousVerification = await Verification.findOne({ userId }).lean();
    const previousStatus = previousVerification?.status || 'pending';

    const verification = await Verification.findOneAndUpdate(
      { userId },
      { status, updatedAt: Date.now() },
      { new: true, upsert: true, lean: true }
    );

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerified: status === 'approved' },
      { new: true, lean: true }
    );

    if (status !== previousStatus && updatedUser.fcmToken) {
      const notificationBody =
        status === 'approved'
          ? 'Your worker verification has been approved!'
          : 'Your worker verification was rejected. Please contact support.';
      const notificationResult = await sendFCMNotification(
        updatedUser.fcmToken,
        'Worker Verification Update',
        notificationBody
      );
      console.log('Notification result:', notificationResult);
    } else if (!updatedUser.fcmToken) {
      console.warn(`No FCM token found for user ${userId}`);
    }

    res.json({
      message: `Worker ${status} successfully`,
      user: updatedUser,
      verification,
    });
  } catch (error) {
    console.error('Error verifying worker:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


exports.getPendingVerifications = async (req, res) => {
  try {
    const verifications = await Verification.find({ status: 'pending' }).populate('userId', 'email name role');
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

    // Fetch users sorted by createdAt in descending order (latest first)
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('email name phone role isVerified createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalUsers = await User.countDocuments({ role: { $ne: 'admin' } });
    const totalPages = Math.ceil(totalUsers / pageSize);

    const userIds = users.map((user) => user._id);
    
    // Fetch profiles for additional information
    const profiles = await Profile.find({ userId: { $in: userIds } })
      .populate('userId','email name phone city town role isVerified')
      .lean();
    
    // Fetch verifications
    const verifications = await Verification.find({ userId: { $in: userIds } })
      .populate('userId', 'email name')
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

// Delete user - preserves reviews but deletes all other related data
exports.deleteUser = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { userId } = req.params;
      
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Find and delete user
      const user = await User.findByIdAndDelete(userId, { session }).lean();
      if (!user) {
        throw new Error('User not found');
      }

      // Delete related data (except reviews)
      await Promise.all([
        Profile.findOneAndDelete({ userId }, { session }),
        Verification.findOneAndDelete({ userId }, { session }),
        Post.findOneAndDelete({ userId }, { session }),
        Verification.findOneAndDelete({ userId }, { session }),
        Job.findOneAndDelete({ userId }, { session }),
        User.findOneAndDelete({ userId }, { session }),
        // Add other models here but exclude Review model
        // Example: Job.deleteMany({ userId }, { session }),
        // Example: Booking.deleteMany({ userId }, { session }),
      ]);
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
};

// Update user by admin

exports.updateUserByAdmin = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const { userId } = req.params;
      const {
        email,
        name,
        phone,
        role,
        isVerified,
        city,
        town,
        address,
        experience,
        skills,
        features,
        documentType,
        documentUrl,
        verificationStatus,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      const existingUser = await User.findOne({ email, _id: { $ne: userId } }, null, { session }).lean();
      if (existingUser) {
        throw new Error('Email already in use');
      }

      const validRoles = ['client', 'worker', 'admin', 'thekadar', 'contractor', 'consultant'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of thesssss: ${validRoles.join(', ')}`);
      }

      const validStatuses = ['pending', 'approved', 'rejected'];
      if (verificationStatus && !validStatuses.includes(verificationStatus)) {
        throw new Error(`Invalid verification status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const currentUser = await User.findById(userId, null, { session }).lean();
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Store previous states for comparison
      const previousVerificationStatus = (await Verification.findOne({ userId }, null, { session })?.status) || 'pending';
      const previousIsVerified = currentUser.isVerified || false;

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          email, 
          name: name || currentUser.name,
          phone: phone || currentUser.phone ,
          role, 
          isVerified: verificationStatus === 'approved' ? true : (isVerified ?? false),
        },
        { new: true, runValidators: true, session, lean: true }
      );

      let profile = null;
      if (role !== 'client') {
      
        
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
            updatedAt: Date.now(),
          },
          { new: true, runValidators: true, upsert: true, session, lean: true }
        );
      } else {
        await Profile.findOneAndDelete({ userId }, { session });
      }

      if (role !== 'client' && (verificationStatus || documentType || documentUrl)) {
        const verificationData = { updatedAt: Date.now() };
        if (verificationStatus) verificationData.status = verificationStatus;
        if (documentType) verificationData.documentType = documentType;
        if (documentUrl) verificationData.documentUrl = documentUrl;

        await Verification.findOneAndUpdate(
          { userId },
          verificationData,
          { new: true, upsert: true, session, lean: true }
        );
      } else if (role === 'client') {
        await Verification.findOneAndDelete({ userId }, { session });
      }

      // Send FCM notification if verification status or isVerified changes
      if (updatedUser.fcmToken) {
        let notificationBody;
        let notificationTitle = 'Verification Status Update';

        if (role !== 'client' && verificationStatus && verificationStatus !== previousVerificationStatus) {
          if (verificationStatus === 'approved') {
            notificationBody = 'Your account has been verified by the admin!';
          } else if (verificationStatus === 'rejected') {
            notificationBody = 'Your account verification was rejected. Please contact support.';
          }
        } else if (role === 'client' && isVerified !== undefined && isVerified !== previousIsVerified) {
          notificationBody = isVerified
            ? 'Your client account has been verified!'
            : 'Your client account verification status has been updated. Please contact support.';
        }

        if (notificationBody) {
          const notificationResult = await sendFCMNotification(
            updatedUser.fcmToken,
            notificationTitle,
            notificationBody
          );
          console.log('Notification result:', notificationResult);
        }
      } else {
        console.warn(`No FCM token found for user ${userId}`);
      }

      return { updatedUser, profile };
    });

    res.json({
      message: 'User updated successfully',
      user: result.updatedUser,
      profile: result.profile,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
};
// Bulk Delete Users
exports.bulkDeleteUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const { userIds } = req.body;

      // Validate input
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Invalid or empty user IDs array');
      }

      // Validate all user IDs
      const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new Error(`Invalid user IDs: ${invalidIds.join(', ')}`);
      }

      // Delete users and related data (excluding reviews)
      const deletedUsers = await User.deleteMany(
        { _id: { $in: userIds }, role: { $ne: 'admin' } }, // Prevent deleting admin users
        { session }
      );

      if (deletedUsers.deletedCount === 0) {
        throw new Error('No users found to delete');
      }

      // Delete related data
      await Promise.all([
        Profile.deleteMany({ userId: { $in: userIds } }, { session }),
        Verification.deleteMany({ userId: { $in: userIds } }, { session }),
        Post.deleteMany({ userId: { $in: userIds } }, { session }),
        Job.deleteMany({ userId: { $in: userIds } }, { session }),
        // Add other models here as needed, excluding Review
      ]);

      res.json({
        message: `Successfully deleted ${deletedUsers.deletedCount} user(s)`,
        deletedCount: deletedUsers.deletedCount,
      });
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error in bulk delete users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
};

// Bulk Update Users
exports.bulkUpdateUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const { userIds, updates } = req.body;

      // Validate input
      if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('Invalid or empty user IDs array');
      }

      const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        throw new Error(`Invalid user IDs: ${invalidIds.join(', ')}`);
      }

      const { role, isVerified, verificationStatus } = updates || {};

      // Validate updates
      const validRoles = ['client', 'worker', 'admin', 'thekadar', 'contractor', 'consultant'];
      if (role && !validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of thessse: ${validRoles.join(', ')}`);
      }

      const validStatuses = ['pending', 'approved', 'rejected'];
      if (verificationStatus && !validStatuses.includes(verificationStatus)) {
        throw new Error(`Invalid verification status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Update users
      const updateData = {};
      if (role) updateData.role = role;
      if (typeof isVerified === 'boolean') {
        updateData.isVerified = verificationStatus === 'approved' ? true : isVerified;
      }

      const updatedUsers = await User.updateMany(
        { _id: { $in: userIds }, role: { $ne: 'admin' } }, // Prevent updating admin users
        updateData,
        { new: true, runValidators: true, session }
      );

      if (updatedUsers.matchedCount === 0) {
        throw new Error('No users found to update');
      }

      let profiles = [];
      let verifications = [];

      // Handle profiles and verifications for non-client roles
      if (role && role !== 'client') {
        if (verificationStatus) {
          verifications = await Verification.updateMany(
            { userId: { $in: userIds } },
            { status: verificationStatus, updatedAt: Date.now() },
            { new: true, upsert: true, session }
          );
        }
      } else if (role === 'client') {
        // Delete profiles and verifications for client role
        await Promise.all([
          Profile.deleteMany({ userId: { $in: userIds } }, { session }),
          Verification.deleteMany({ userId: { $in: userIds } }, { session }),
        ]);
      }

      // Send FCM notifications for updated users
      const users = await User.find({ _id: { $in: userIds } }, null, { session }).lean();
      for (const user of users) {
        if (user.fcmToken && (role || isVerified !== undefined || verificationStatus)) {
          let notificationBody;
          let notificationTitle = 'Account Update';

          if (role && role !== user.role) {
            notificationBody = `Your account role has been updated to ${role}.`;
          } else if (typeof isVerified !== 'undefined' && isVerified !== user.isVerified) {
            notificationBody = isVerified
              ? 'Your account has been verified!'
              : 'Your account verification status has been updated.';
          } else if (role !== 'client' && verificationStatus && verificationStatus !== 'pending') {
            notificationBody =
              verificationStatus === 'approved'
                ? 'Your verification has been approved!'
                : 'Your verification was rejected. Please contact support.';
            notificationTitle = 'Verification Status Update';
          }

          if (notificationBody) {
            const notificationResult = await sendFCMNotification(
              user.fcmToken,
              notificationTitle,
              notificationBody
            );
            console.log(`Notification sent to user ${user._id}:`, notificationResult);
          }
        }
      }

      return { updatedCount: updatedUsers.matchedCount, profiles, verifications };
    });

    res.json({
      message: `Successfully updated ${result.updatedCount} user(s)`,
      updatedCount: result.updatedCount,
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error in bulk update users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
};