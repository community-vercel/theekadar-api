// controllers/authController.js
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TempUser = require('../models/newuser');
const nodemailer = require('nodemailer');

// Validation schema for registration
const registerSchema = Joi.object({
  email: Joi.string().email().allow('').optional(),
  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .allow('')
    .optional(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(),
  role: Joi.string()
    .valid('client', 'worker', 'thekadar', 'contractor', 'consultant', 'admin')
    .required(),
  tempUserId: Joi.string().optional(),
}).custom((value, helpers) => {
  if (!value.email && !value.phone) {
    return helpers.error('any.custom', {
      message: 'Either email or phone is required',
    });
  }
  if (value.email && value.phone) {
    return helpers.error('any.custom', {
      message: 'Provide either email or phone, not both',
    });
  }
  return value;
});

// Validation schema for email/phone uniqueness
const validateUserSchema = Joi.object({
  email: Joi.string().email().allow('').optional(),
  phone: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .allow('')
    .optional(),
}).custom((value, helpers) => {
  if (!value.email && !value.phone) {
    return helpers.error('any.custom', {
      message: 'Either email or phone is required',
    });
  }
  if (value.email && value.phone) {
    return helpers.error('any.custom', {
      message: 'Provide either email or phone, not both',
    });
  }
  return value;
});

// Joi schema for login validation
const loginSchema = Joi.object({
  identifier: Joi.string().required(), // Can be email or phone
  password: Joi.string().required(),
});

// Send email OTP for registration
exports.sendEmailOTP = async (req, res) => {
  const { email } = req.body;

  try {
    // Validate email
    const schema = Joi.object({
      email: Joi.string().email().required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check if email already exists in User collection
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if email is already in TempUser (to avoid duplicates)
    const existingTempUser = await TempUser.findOne({ email });
    if (existingTempUser) {
      await existingTempUser.deleteOne();
    }

    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create a temporary user record
    const tempUser = new TempUser({
      email,
      emailVerificationCode: otpCode,
      emailVerificationExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
      isVerified: false,
    });
    await tempUser.save();

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
      to: email,
      subject: 'Your Registration OTP Code',
      text: `Your registration OTP code is: ${otpCode}. This code will expire in 10 minutes.`,
      html: `<p>Your registration OTP code is:</p><h2>${otpCode}</h2><p>This code will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent to email', tempUserId: tempUser._id });
  } catch (error) {
    console.error('Error sending email OTP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Verify email OTP
exports.verifyEmailOTP = async (req, res) => {
  const { tempUserId, code } = req.body;

  try {
    const schema = Joi.object({
      tempUserId: Joi.string().required(),
      code: Joi.string().length(6).required(),
    });
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const tempUser = await TempUser.findOne({
      _id: tempUserId,
      emailVerificationCode: code,
      emailVerificationExpires: { $gt: Date.now() },
    });

    if (!tempUser) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Mark TempUser as verified
    tempUser.isVerified = true;
    await tempUser.save();

    res.status(200).json({ message: 'OTP verified successfully', tempUserId: tempUser._id });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Validate email or phone uniqueness
exports.validateUser = async (req, res) => {
  const { error } = validateUserSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, phone } = req.body;

  try {
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) return res.status(400).json({ message: 'Email already exists' });
      const existingTempUser = await TempUser.findOne({ email });
      if (existingTempUser) return res.status(400).json({ message: 'Email is pending verification' });
    } else if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) return res.status(400).json({ message: 'Phone number already exists' });
    }

    res.status(200).json({ message: 'Email or phone is available' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Register user (called after OTP verification)
exports.register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, phone, password, name, role, tempUserId } = req.body;

  try {
    let user;
    if (email && tempUserId) {
      // Email-based registration
      const tempUser = await TempUser.findOne({ _id: tempUserId, isVerified: true });
      if (!tempUser) return res.status(400).json({ message: 'Email OTP not verified' });

      // Create new User document
      user = new User({
        email,
        name,
        role,
        password: await bcrypt.hash(password, 10),
        isVerified: true,
      });
      await user.save();

      // Delete TempUser record
      await tempUser.deleteOne();
    } else if (phone) {
      // Phone-based registration
      user = await User.findOne({ phone, isVerified: true });
      if (!user) {
        // Create new User document if not exists
        user = new User({
          phone,
          name,
          role,
          password: await bcrypt.hash(password, 10),
          isVerified: true,
        });
        await user.save();
      } else {
        // Update existing user
        user.name = name;
        user.role = role;
        user.password = await bcrypt.hash(password, 10);
        await user.save();
      }
    } else {
      return res.status(400).json({ message: 'Email or phone required' });
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
      email: user.email,
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
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) return res.status(400).json({ message: 'Invalid email or phone number' });

    if (user.googleId && !user.password) {
      return res.status(400).json({ message: 'Please use Google Sign-In for this account' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.isVerified) {
      return res.status(400).json({ message: 'Account not verified' });
    }

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
      email: user.email,
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
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

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

    user.password = await bcrypt.hash(password, 10);
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