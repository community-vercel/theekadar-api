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

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: 'Gmail', // Replace with your email service (e.g., SendGrid, AWS SES)
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      },
    });

    // Email content
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`; // Replace with your frontend URL
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`,
      html: `<p>You requested a password reset. Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>This link will expire in 1 hour.</p>`,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find user by reset token and check expiration
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined; // Clear token
    user.resetPasswordExpires = undefined; // Clear expiration
    await user.save();

    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};