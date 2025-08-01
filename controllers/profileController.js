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
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).optional() // [longitude, latitude]
  }).optional(),
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
    address: req.body.address,
    logo: logoUrl,
    skills: skills || [],
    features: features || [],
    location: location || { type: 'Point', coordinates: [] },
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
  profile.location = req.body.location || profile.location;

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

  const { lng, lat, radius, role } = req.query;

  // Convert radius from kilometers to meters (MongoDB uses meters for geospatial queries)
  const radiusInMeters = parseFloat(radius) * 1000;

  // Build query
  let query = {
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)],
        },
        $maxDistance: radiusInMeters,
      },
    },
    verificationStatus: 'approved', // Only return verified profiles
  };

  // Add role filter if provided
  if (role) {
    query['userId.role'] = role;
  }

  try {
    // Find profiles, populate user role, and exclude empty coordinates
    const profiles = await Profile.find({
      ...query,
      'location.coordinates': { $ne: [] }, // Exclude profiles with empty coordinates
    })
      .populate('userId', 'role')
      .select('userId name phone address location skills features logo callCount');

    res.json(profiles);
  } catch (err) {
    res.status(500).json({ message: 'Error performing geospatial query', error: err.message });
  }
};