// controllers/profileController.js
const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post = require('../models/Post');
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
  experiance: Joi.number().required().min(0), // New field: required
});

// Validation schema for near query
const postSearchSchema = Joi.object({
  city: Joi.string().optional(),
  town: Joi.string().optional(),
  address: Joi.string().optional(),
  role: Joi.string().valid('client', 'worker', 'thekadar', 'contractor', 'consultant').optional(),
  category: Joi.string().optional(),
  serviceType: Joi.string().valid('general', 'specialized', 'emergency', 'long_term').optional(),
  projectScale: Joi.string().valid('small', 'medium', 'large').optional(),
  minHourlyRate: Joi.number().min(0).optional(),
  maxHourlyRate: Joi.number().min(0).optional(),
  availability: Joi.boolean().optional(),
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
    experiance: req.body.experiance,
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
  profile.experiance = req.body.experiance || profile.experiance;
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
   try {
    // Validate query parameters
    const { error } = postSearchSchema.validate(req.query);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const {
      city,
      town,
      address,
      role,
      category,
      serviceType,
      projectScale,
      minHourlyRate,
      maxHourlyRate,
      availability,
    } = req.query;

    // Build match stage for aggregation
    let matchStage = {
      'profile.verificationStatus': 'approved', // Only include posts from verified profiles
    };

    // Add filters to match stage
    if (city) matchStage['profile.city'] = { $regex: `^${city}$`, $options: 'i' };
    if (town) matchStage['profile.town'] = { $regex: `^${town}$`, $options: 'i' };
    if (address) matchStage['profile.address'] = { $regex: address, $options: 'i' };
    if (role) matchStage['user.role'] = role;
    if (category) matchStage.category = { $regex: category, $options: 'i' };
    if (serviceType) matchStage.serviceType = serviceType;
    if (projectScale) matchStage.projectScale = projectScale;
    if (availability !== undefined) matchStage.availability = availability;
    if (minHourlyRate || maxHourlyRate) {
      matchStage.hourlyRate = {};
      if (minHourlyRate) matchStage.hourlyRate.$gte = Number(minHourlyRate);
      if (maxHourlyRate) matchStage.hourlyRate.$lte = Number(maxHourlyRate);
    }

    // Aggregation pipeline
    const posts = await Post.aggregate([
      // Lookup to join with User collection
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      // Unwind user array (since $lookup returns an array)
      { $unwind: '$user' },
      // Lookup to join with Profile collection
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      // Unwind profile array
      { $unwind: '$profile' },
      // Match stage for filtering
      { $match: matchStage },
      // Project only necessary fields
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          images: 1,
          hourlyRate: 1,
          availability: 1,
          serviceType: 1,
          projectScale: 1,
          certifications: 1,
          createdAt: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            phone: '$user.phone',
            role: '$user.role',
            email: '$user.email',
          },
          profile: {
            name: '$profile.name',
            phone: '$profile.phone',
            city: '$profile.city',
            town: '$profile.town',
            address: '$profile.address',
            skills: '$profile.skills',
            features: '$profile.features',
            logo: '$profile.logo',
            callCount: '$profile.callCount',
          },
        },
      },
      // Sort by createdAt (newest first)
      { $sort: { createdAt: -1 } },
    ]);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Error performing query', error: err.message });
  }};