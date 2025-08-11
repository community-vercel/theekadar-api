// controllers/profileController.js
const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post = require('../models/Post');
const { put } = require('@vercel/blob');

// Validation schema for profile creation and update

// Validation schema for near query (unchanged)
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
// controllers/profileController.js
const profileSchema = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
  skills: Joi.array().items(Joi.string()).optional(),
  features: Joi.array().items(Joi.string()).optional(),
  city: Joi.string().required(),
  town: Joi.string().required(),
  experience: Joi.number().required().min(0), // Fixed: 'experiance' → 'experience'
  logo: Joi.string().optional(),
});

// controllers/profileController.js
exports.createProfile = async (req, res) => {
    console.log('req.user:', req.user); // Debug: Log req.user
  console.log('userId:', req.user?.userId); // De
  const { error } = profileSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findById(req.user.userId);
  if (!user) return res.status(404).json({ message: 'User not found' }); // Add this check
  if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

  const existingProfile = await Profile.findOne({ userId: req.user.userId });
  if (existingProfile) return res.status(400).json({ message: 'Profile already exists' });

  const { skills, features } = req.body;
  if (skills && user.role !== 'worker') {
    return res.status(403).json({ message: 'Only workers can add skills' });
  }
  if (features && !['thekadar', 'small_consultant', 'large_consultant'].includes(user.role)) {
    return res.status(403).json({ message: 'Only thekadar or consultants can add features' });
  }

  let logoUrl = '';
  if (req.body.logo) {
    try {
      const base64Data = req.body.logo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `profiles/${Date.now()}-logo.jpg`;
      const { url } = await put(fileName, buffer, {
        access: 'public',
        token: process.env.VERCEL_BLOB_TOKEN,
      });
      logoUrl = url;
    } catch (uploadError) {
      return res.status(500).json({ message: 'Failed to upload logo', error: uploadError.message });
    }
  }

  try {
    const profile = new Profile({
      userId: req.user.userId,
      name: req.body.name,
      phone: req.body.phone,
      city: req.body.city,
      town: req.body.town,
      address: req.body.address,
      experience: req.body.experience, // Use 'experience' (assuming schema is updated)
      logo: logoUrl,
      skills: skills || [],
      features: features || [],
    });

    await profile.save();
    res.status(201).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create profile', error: error.message });
  }
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

  let logoUrl = profile.logo;
  if (req.body.logo) {
    try {
      const base64Data = req.body.logo.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `profiles/${Date.now()}-logo.jpg`;
      const { url } = await put(fileName, buffer, {
        access: 'public',
        token: process.env.VERCEL_BLOB_TOKEN,
      });
      logoUrl = url;
    } catch (uploadError) {
      return res.status(500).json({ message: 'Failed to upload logo', error: uploadError.message });
    }
  }

  try {
    // Update User name if provided
    if (req.body.name) {
      user.name = req.body.name;
      await user.save();
    }

    // Update Profile fields
    profile.name = req.body.name || profile.name;
    profile.phone = req.body.phone || profile.phone;
    profile.address = req.body.address || profile.address;
    profile.skills = req.body.skills || profile.skills;
    profile.features = req.body.features || profile.features;
    profile.experience = req.body.experience || profile.experience;
    profile.city = req.body.city || profile.city;
    profile.town = req.body.town || profile.town;
    profile.logo = logoUrl;

    await profile.save();

    // Return merged updated data
    const mergedProfile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      profileImage: profile.logo,
      skills: profile.skills,
      experience: profile.experience,
      callCount: profile.callCount,
      city: profile.city,
      town: profile.town,
      address: profile.address,
      verificationStatus: profile.verificationStatus,
    };

    res.json({ message: 'Profile updated successfully', profile: mergedProfile });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};


// Other functions remain unchanged
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
    const { error } = postSearchSchema.validate(req.query);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { city } = req.query;
    console.log('Query parameters:', req.query);

    let matchStage = {};
    if (city) matchStage['profile.city'] = { $regex: `^${city}$`, $options: 'i' };

    const posts = await Post.aggregate([
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $lookup: { from: 'profiles', localField: 'userId', foreignField: 'userId', as: 'profile' } },
      { $unwind: '$profile' },
      { $match: matchStage },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          user: { _id: '$user._id', name: '$user.name', role: '$user.role' },
          profile: { city: '$profile.city', verificationStatus: '$profile.verificationStatus' }
        }
      }
    ]);

    console.log('Found posts:', posts);
    res.json(posts);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Error performing query', error: err.message });
  }
};