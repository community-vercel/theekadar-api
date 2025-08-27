const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post=require('../models/Post');
const Review=require('../models/Review');
const { authMiddleware } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { put } = require('@vercel/blob'); // For image uploads

const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
router.post('/google/mobile', async (req, res) => {
  try {
    const { idToken, name, phone, role } = req.body;

    console.log('Verifying idToken with GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    let user = await User.findOne({ googleId: payload.sub });

    let isNewUser = false;

    if (!user) {
      const existingEmailUser = await User.findOne({ email: payload.email });
      if (existingEmailUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use',
          message: 'This email is already registered with another account.',
        });
      }

      if (phone) {
        const existingPhoneUser = await User.findOne({ phone });
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            error: 'Phone number already in use',
            message: 'This phone number is already registered with another account.',
          });
        }
      }

      // If no user exists, check if all required fields are provided for new user creation
      if (name && phone && role) {
        isNewUser = true;
        user = new User({
          googleId: payload.sub,
          email: payload.email,
          name: name || payload.name,
          phone: phone || null,
          role: role,
          profileImage: payload.picture,
          isVerified: true,
        });
        await user.save();
      } else {
        // Return response indicating additional info is needed
        return res.json({
          success: true,
          isNewUser: true,
          hasRole: false,
          user: {
            email: payload.email,
            name: payload.name,
            profileImage: payload.picture,
          },
        });
      }
    } else {
      // For existing users, allow updating name, phone, or role if provided
      if (name && name !== user.name) user.name = name;
      if (phone) {
        // Check if the new phone number is already in use by another user
        const existingPhoneUser = await User.findOne({ phone, _id: { $ne: user._id } });
        if (existingPhoneUser) {
          return res.status(400).json({
            success: false,
            error: 'Phone number already in use',
            message: 'This phone number is already registered with another account.',
          });
        }
        user.phone = phone;
      }
      if (role && role !== user.role) user.role = role;
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      userId: user._id,
      isVerified: user.isVerified,
      role: user.role,
      isNewUser,
      hasRole: !!user.role,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    console.error('Google authentication error:', err);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: err.message,
    });
  }
});
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/validate-user', authController.validateUser); // New endpoint
router.post('/send-email-otp', authController.sendEmailOTP);
router.post('/verify-email-otp', authController.verifyEmailOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
// routes/authRoutes.js
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const profile = await Profile.findOne({ userId })
      .populate({
        path: 'userId',
        model: 'User',
        select: 'name email phone role isVerified createdAt',
      });

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const response = {
      _id: profile.userId._id,
      name: profile.userId.name,
      email: profile.userId.email,
      phone: profile.userId.phone || profile.phone || null,
      role: profile.userId.role,
      isVerified: profile.userId.isVerified,
      createdAt: profile.userId.createdAt,
      latitude:profile.latitude || null,
      longitude:profile.longitude || null,
      profileImage: profile.logo || null,
      skills: profile.skills || [],
      features:profile.features || [],
      experience: profile.experience || 0,
      callCount: profile.callCount || 0,
      city: profile.city || null,
      town: profile.town || null,
      address: profile.address || null,
      verificationStatus: profile.verificationStatus || null,
    };

    res.status(200).json({ message: 'Profile details retrieved successfully', profile: response });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.get('/client/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Find the user directly
    const user = await User.findById(userId).select(
      'name email phone role isVerified profileImage createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }


    // Build the response
    const response = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profileImage:user.profileImage || user.logo,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };

    res
      .status(200)
      .json({ message: 'User details retrieved successfully', user: response });
  } catch (error) {
    console.error('Error:', error);
    res
      .status(500)
      .json({ message: 'Server error', error: error.message });
  }
});


// Update user info
router.put('/client/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Upload profile image if provided (base64)
    let profileImageUrl = user.profileImage;
    if (req.body.profileImage) {
      try {
        const base64Data = req.body.profileImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `users/${Date.now()}-profile.jpg`;
        const { url } = await put(fileName, buffer, {
          access: 'public',
          token: process.env.VERCEL_BLOB_TOKEN,
        });
        profileImageUrl = url;
      } catch (uploadError) {
        return res.status(500).json({ message: 'Failed to upload profile image', error: uploadError.message });
      }
    }

    // Update fields
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.role = req.body.role || user.role;
    user.isVerified = req.body.isVerified !== undefined ? req.body.isVerified : user.isVerified;
    user.profileImage = profileImageUrl;

    await user.save();

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.post('/update-fcm-token', async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { fcmToken },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'FCM token updated successfully' });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});




module.exports = router;