// controllers/profileController.js
const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/profile');
const { uploadFile } = require('../utils/vercelBlob');

// Validation schema for profile creation and update
const profileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  features: Joi.array().items(Joi.string()).optional(),
 city: Joi.string().required(),
  town: Joi.string().required(),
});

// Validation schema for near query
const nearSchema = Joi.object({
  lng: Joi.number().min(-180).max(180).required(),
  lat: Joi.number().min(-90).max(90).required(),
  radius: Joi.number().min(0).required(), // In kilometers
  role: Joi.string().valid('worker', 'thekadar', 'small_consultant', 'large_consultant').optional(),
});

exports.createProfile = async (req, res) => {
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findById(req.user.userId);
  if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

  const existingProfile = await Profile.findOne({ userId: req.user.userId });
  if (existingProfile) return res.status(400).json({ message: 'Profile already exists' });

  const { skills, features, location } = req.body;
  if (skills && user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can add skills' });
  }
  if (features && !['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
    return res.status(403).json({ message: 'Only thekadar or consultants can add features' });
  }

  let logoUrl = '';
  if (req.file) logoUrl = await uploadFile(req.file);

  const profile = new Profile({
    userId: req.user.userId,
    name: req.body.name,
    phone: req.body.phone,
    city: req.body.city,
    town: req.body.town,
    address: req.body.address,
    logo: logoUrl,
    skills: skills || [],
    features: features || [],
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
profile.city = req.body.city || profile.city;
  profile.town = req.body.town || profile.town;
  if (req.file) profile.logo = await uploadFile(req.file);

  await profile.save();
  res.json(profile);
};

exports.incrementCallCount = async (req, res) => {
  const { userId } = req.params;

  const targetUser = await User.findById(userId);
  if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

  const profile = await Profile.findOne({ userId });
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  profile.callCount += 1;
  await profile.save();

  res.status(200).json({ message: 'Call count incremented', callCount: profile.callCount });
};

exports.getCallCount = async (req, res) => {
  const { userId } = req.params;

  const targetUser = await User.findById(userId);
  if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

  const profile = await Profile.findOne({ userId }, 'callCount userId');
  if (!profile) return res.status(404).json({ message: 'Profile not found' });

  res.status(200).json({ userId: profile.userId, callCount: profile.callCount });
};

exports.findProfilesNear = async (req, res) => {
  const { error } = nearSchema.validate(req.query);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { city, town, address, role } = req.query;

  // Build query
  let query = {
    city: { $regex: `^${city}$`, $options: 'i' }, // Case-insensitive exact match for city
    town: { $regex: `^${town}$`, $options: 'i' }, // Case-insensitive exact match for town
    verificationStatus: 'approved', // Only return verified profiles
  };

  // Add address filter if provided (partial match)
  if (address) {
    query.address = { $regex: address, $options: 'i' }; // Case-insensitive partial match
  }

  // Add role filter if provided
  if (role) {
    query['userId.role'] = role;
  }

  try {
    // Find profiles, populate user role
    const profiles = await Profile.find(query)
      .populate('userId', 'role')
      .select('userId name phone city town address skills features logo callCount');

    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: 'Error performing query', error: err.message });
  }
};