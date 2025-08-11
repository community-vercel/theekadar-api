// controllers/authController.js
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const Profile = require('../models/profile');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


// Validation schema for registration
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().required(), // New field: required
  phone: Joi.string().optional(), // New field: optional
  role: Joi.string().valid('client', 'worker', 'thekadar', 'contractor', 'consultant').required(),
});

// Validation schema for login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// controllers/authController.js
exports.register = async (req, res) => {
  const { error } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password, name, phone, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, name, phone, role });
  await user.save();

  const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({ token, userId: user._id });
};
exports.login = async (req, res) => {
  const { error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

  const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, userId: user._id,isVerified:user.isVerified });
};


exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save OTP and expiration (10 minutes)
    user.resetPasswordCode = otpCode;
    user.resetPasswordExpires = Date.now() + 200 * 60 * 1000;
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
      text: `Your password reset code is: ${otpCode}. This code will expire in 20 hour.`,
      html: `<p>Your password reset code is:</p><h2>${otpCode}</h2><p>This code will expire in 20 hour.</p>`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Reset code sent to email' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
exports.verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  try {
    console.log("Received Email:", email);
console.log("Received Code:", code);




    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: Date.now() }, // Not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    // Mark as verified (optional: store a short-lived token instead)
    user.resetPasswordVerified = true;
    await user.save();

    res.status(200).json({ message: 'Code verified successfully' });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


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



