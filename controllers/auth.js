// controllers/authController.js
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const Profile = require('../models/profile');

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
  const { email, password, name, phone, role, city, town, address, skills, experience } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    // Create new user
    user = new User({
      email,
      password: await bcrypt.hash(password, 10),
      name,
      phone,
      role,
    });

    await user.save();

    // Create profile
    const profile = new Profile({
      userId: user._id,
      name,
      phone,
      city: city || '', // Required field
      town: town || '', // Required field
      address,
      experience: experience || 0, // Required field
      skills: skills || [],
    });

    await profile.save();

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User and profile created successfully', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
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