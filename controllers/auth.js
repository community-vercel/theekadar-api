// E:\theekadar-api\controllers\auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { uploadToVercelBlob } = require('../utils/blob');
const { sendNotification } = require('../utils/pusher');
const crypto = require('crypto');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendEmail } = require('../utils/email'); // New utility for sending emails

const register = async (req, res) => {
  const { email, password, name, phone, address, role, location } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({
      email,
      password: hashedPassword,
      name,
      phone,
      address,
      role,
      location,
    });

    await user.save();

    if (['worker', 'thekedar'].includes(role)) {
      await sendNotification('admin', `New ${role} registered: ${name}`, 'general');
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadVerificationDocument = async (req, res) => {
  const { type } = req.body;
  const file = req.files?.document;

  try {
    if (!file) {
      return res.status(400).json({ error: 'Document file is required' });
    }
    if (!['worker', 'thekedar'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only workers and thekedars can upload verification documents' });
    }

    const url = await uploadToVercelBlob(file.data, `${req.user.id}-${type}-${Date.now()}`);
    const user = await User.findById(req.user.id);
    user.verificationDocuments.push({ type, url, status: 'pending' });
    await user.save();

    await sendNotification('admin', `New verification document uploaded by ${user.name} (${req.user.role})`, 'general');
    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate a random reset token
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      userId: user._id,
      token,
    });

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: `Click here to reset your password: ${resetUrl}\nThis link expires in 1 hour.`,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    const user = await User.findById(resetToken.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // Delete the used token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, uploadVerificationDocument, forgotPassword, resetPassword };