// controllers/profileController.js
const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/profile'); // Fixed typo in import (profile -> Profile)
const { uploadFile } = require('../utils/vercelBlob');

// Validation schema for profile creation
const profileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).optional(), // For workers
  features: Joi.array().items(Joi.string()).optional(), // For thekadar/consultants
});

exports.createProfile = async (req, res) => {
  // Validate input
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findById(req.user.userId);
  if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

  // Check if profile already exists
  const existingProfile = await Profile.findOne({ userId: req.user.userId });
  if (existingProfile) return res.status(400).json({ message: 'Profile already exists' });

  // Role-based validation for skills and features
  const { skills, features } = req.body;
  if (skills && user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can add skills' });
  }
  if (features && !['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
    return res.status(403).json({ message: 'Only thekadar or consultants can add features' });
  }

  // Upload logo if provided
  let logoUrl = '';
  if (req.file) logoUrl = await uploadFile(req.file);

  // Create profile
  const profile = new Profile({
    userId: req.user.userId,
    name: req.body.name,
    phone: req.body.phone,
    address: req.body.address,
    logo: logoUrl,
    skills: skills || [], // Add skills if provided (for workers)
    features: features || [], // Add features if provided (for thekadar/consultants)
  });

  await profile.save();
  res.status(201).json(profile);
};

exports.updateProfile = async (req, res) => {
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findById(req.user.userId);
  const profile = await Profile.findOne({ userId: req.user.userId });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  if (req.body.skills && user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can add skills' });
  }
  if (req.body.features && !['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
    return res.status(403).json({ message: 'Only thekadar or consultants can add features' });
  }

  profile.name = req.body.name || profile.name;
  profile.phone = req.body.phone || profile.phone;
  profile.address = req.body.address || profile.address;
  profile.skills = req.body.skills || profile.skills;
  profile.features = req.body.features || profile.features;

  if (req.file) profile.logo = await uploadFile(req.file);

  await profile.save();
  res.json(profile);
};