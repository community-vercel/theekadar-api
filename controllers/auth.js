// controllers/authController.js
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/profile');
const nodemailer = require('nodemailer');

// Validation schema for registration
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  phone: Joi.string().optional(),
  role: Joi.string().valid('client', 'worker', 'thekadar', 'contractor', 'consultant', 'admin').required(),
});

// Validation schema for email/phone uniqueness
const validateUserSchema = Joi.object({
  email: Joi.string().email().required(),
  phone: Joi.string().optional(),
});

// Joi schema for login validation
const loginSchema = Joi.object({
  identifier: Joi.string().required(), // Can be email or phone
  password: Joi.string().required(),
});

// Validate email/phone uniqueness
exports.validateUser = async (req, res) => {
  const { error } = validateUserSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, phone } = req.body;

  try {
    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });

    // Check if phone already exists
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(400).json({ message: 'Phone number already exists' });
    }

    res.status(200).json({ message: 'Email and phone are available' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register user (called after OTP verification)
exports.register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password, name, phone, role } = req.body;

  try {
    // Double-check email/phone uniqueness (optional, as client should have validated)
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const existingPhone = await User.findOne({ phone });
    if (existingPhone) return res.status(400).json({ message: 'Phone number already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with isVerified set to true (since OTP is verified)
    const user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      role,
      isVerified: true, // OTP verification is assumed to be done
    });
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      userId: user._id,
      isVerified: user.isVerified,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { identifier, password } = req.body;

  try {
    // Find user by email or phone
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) return res.status(400).json({ message: 'Invalid email or phone number' });

    // Check if user is a Google user (no password)
    if (user.googleId && !user.password) {
      return res.status(400).json({ message: 'Please use Google Sign-In for this account' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: 'Phone number not verified' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      userId: user._id,
      isVerified: user.isVerified,
      role: user.role,
      name: user.name,
      phone: user.phone,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiration (10 minutes)
    user.resetPasswordCode = otpCode;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your Password Reset Code',
      text: `Your password reset code is: ${otpCode}. This code will expire in 10 minutes.`,
      html: `<p>Your password reset code is:</p><h2>${otpCode}</h2><p>This code will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Reset code sent to email' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify Reset Code
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }, // Not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Mark as verified
    user.resetPasswordVerified = true;
    await user.save();

    res.status(200).json({ message: 'Code verified successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !user.resetPasswordVerified) {
      return res.status(400).json({ message: 'Password reset not verified' });
    }

    // Hash password
    user.password = await bcrypt.hash(password, 10);

    // Clear reset fields
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordVerified = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};