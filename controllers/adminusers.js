const Profile = require('../models/profile');
const Verification = require('../models/Verification');
const User = require('../models/User');
const Post=require('../models/Post');
const Job=require('../models/Job')
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
    
    // Validate userId
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    
    // Check if user exists and is not a client
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'client') {
      return res.status(400).json({ message: 'Verification not applicable for client role' });
    }

    // Update verification status
    const verification = await Verification.findOneAndUpdate(
      { userId },
      { status, updatedAt: Date.now() },
      { new: true, upsert: true, lean: true }
    );

    // Update user verification status
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerified: status === 'approved' },
      { new: true, lean: true }
    );

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
      .populate('userId', 'email name phone role isVerified')
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
        // Profile fields
        city,
        town,
        address,
        experience,
        skills,
        features,
        // Verification fields
        documentType,
        documentUrl,
        verificationStatus,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Check for duplicate email
      const existingUser = await User.findOne({ email, _id: { $ne: userId } }, null, { session }).lean();
      if (existingUser) {
        throw new Error('Email already in use');
      }

      // Validate role
      const validRoles = ['client', 'worker', 'admin', 'thekadar', 'contractor', 'consultant'];
      if (!validRoles.includes(role)) {
        throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
      }

      // Validate verification status if provided
      const validStatuses = ['pending', 'approved', 'rejected'];
      if (verificationStatus && !validStatuses.includes(verificationStatus)) {
        throw new Error(`Invalid verification status. Must be one of: ${validStatuses.join(', ')}`);
      }

      // Get current user
      const currentUser = await User.findById(userId, null, { session }).lean();
      if (!currentUser) {
        throw new Error('User not found');
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          email, 
          name: name || currentUser.name,
          phone: phone || currentUser.phone,
          role, 
          isVerified: verificationStatus === 'approved' ? true : (isVerified ?? false)
        },
        { new: true, runValidators: true, session, lean: true }
      );

      let profile = null;

      // Handle profile based on role
      if (role !== 'client') {
        // Non-client roles need profile
        if (!name || !city || !town || !experience) {
          throw new Error('Name, city, town, and experience are required for non-client roles');
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
          },
          { new: true, runValidators: true, upsert: true, session, lean: true }
        );
      } else {
        // Client role - remove profile if exists
        await Profile.findOneAndDelete({ userId }, { session });
      }

      // Handle verification
      if (role !== 'client' && (verificationStatus || documentType || documentUrl)) {
        const verificationData = {};
        if (verificationStatus) verificationData.status = verificationStatus;
        if (documentType) verificationData.documentType = documentType;
        if (documentUrl) verificationData.documentUrl = documentUrl;
        verificationData.updatedAt = Date.now();

        await Verification.findOneAndUpdate(
          { userId },
          verificationData,
          { new: true, upsert: true, session, lean: true }
        );
      } else if (role === 'client') {
        // Client role - remove verification if exists
        await Verification.findOneAndDelete({ userId }, { session });
      }

      return { updatedUser, profile }; // Return result for withTransaction
    });

    // No need to call session.commitTransaction() as withTransaction handles it
    res.json({
      message: 'User updated successfully',
      user: result.updatedUser,
      profile: result.profile,
    });
  } catch (error) {
    // Only abort if the transaction is still active
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    await session.endSession();
  }
};