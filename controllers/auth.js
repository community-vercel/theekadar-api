// E:\theekadar-api\controllers\auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { uploadToVercelBlob } = require('../utils/blob');
const { sendNotification } = require('../utils/pusher');

const register = async (req, res) => {
  const { email, password, name, phone, address, role } = req.body;

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
    });

    await user.save();

    // Notify admin for worker verification
    if (role === 'worker') {
      await sendNotification('admin', `New worker registered: ${name}`, 'general');
    }

    res.status(201).json({ message: 'User registered successfully' });
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

const uploadVerificationDocument = async (req, res) => {
  const { type } = req.body;
  const file = req.files?.document;

  try {
    if (!file) {
      return res.status(400).json({ error: 'Document file is required' });
    }

    const url = await uploadToVercelBlob(file.data, `${req.user.id}-${type}-${Date.now()}`);
    const user = await User.findById(req.user.id);
    user.verificationDocuments.push({ type, url, status: 'pending' });
    await user.save();

    await sendNotification('admin', `New verification document uploaded by ${user.name}`, 'general');
    res.json({ message: 'Document uploaded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, uploadVerificationDocument };