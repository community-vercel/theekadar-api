// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post=require('../models/Post');
const Review=require('../models/Review');
const { authMiddleware } = require('../middleware/auth');

const { put } = require('@vercel/blob'); // For image uploads
const axios = require('axios');

const mongoose = require('mongoose');
const {
  FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
  SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 5, // 5 days
} = process.env;
const ID_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-reset-code', authController.verifyResetCode);
router.post('/reset-password', authController.resetPassword);
router.post('/send-otp', async (req, res) => {
  try {
    const { phoneNumber, recaptchaToken, safetyNetToken, playIntegrityToken } = req.body || {};

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' });
    }

    // For web: recaptchaToken (recommended). For Android: safetyNetToken or playIntegrityToken.
    const body = { phoneNumber };
    if (recaptchaToken) body.recaptchaToken = recaptchaToken;
    if (safetyNetToken) body.safetyNetToken = safetyNetToken;
    if (playIntegrityToken) body.playIntegrityToken = playIntegrityToken;

    const url = `${ID_TOOLKIT_BASE}/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`;

    const { data } = await axios.post(url, body, { timeout: 10000 });
    // data.sessionInfo => return to client and use to verify code
    return res.json({ sessionInfo: data.sessionInfo });
  } catch (err) {
    // pass Firebase error details
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: err.message || 'sendVerificationCode failed' };
    return res.status(status).json(data);
  }
});

/**
 * POST /firebase/verify-otp
 * body: { sessionInfo: string, code: string, createSessionCookie?: boolean }
 * returns: { idToken, refreshToken, phoneNumber, expiresIn, sessionCookie: boolean }
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { sessionInfo, code, createSessionCookie = true } = req.body || {};
    if (!sessionInfo || !code) {
      return res.status(400).json({ error: 'sessionInfo and code are required' });
    }

    const url = `${ID_TOOLKIT_BASE}/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`;
    const { data } = await axios.post(url, { sessionInfo, code }, { timeout: 10000 });
    // data: { idToken, refreshToken, phoneNumber, expiresIn }

    let createdCookie = false;
    if (createSessionCookie && data.idToken) {
      const expiresIn = parseInt(SESSION_COOKIE_MAX_AGE, 10);
      try {
        const sessionCookie = await admin.auth().createSessionCookie(data.idToken, { expiresIn });
        // set cookie; secure should be true in production (HTTPS)
        res.cookie('fb_session', sessionCookie, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
          maxAge: expiresIn,
        });
        createdCookie = true;
      } catch (cookieErr) {
        // cookie creation failed: continue but inform client
        console.error('createSessionCookie error', cookieErr);
      }
    }

    return res.json({
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      phoneNumber: data.phoneNumber,
      expiresIn: data.expiresIn,
      sessionCookie: createdCookie,
    });
  } catch (err) {
    const status = err?.response?.status || 500;
    const data = err?.response?.data || { error: err.message || 'signInWithPhoneNumber failed' };
    return res.status(status).json(data);
  }
});

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
      phone: profile.userId.phone,
      role: profile.userId.role,
      isVerified: profile.userId.isVerified,
      createdAt: profile.userId.createdAt,
      profileImage: profile.logo || null,
      skills: profile.skills || [],
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






module.exports = router;