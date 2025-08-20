// controllers/profileController.js
const Joi = require('joi');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post = require('../models/Post');
const Review=require('../models/Review');
const { put } = require('@vercel/blob');

// Validation schema for profile creation and update

// Validation schema for near query (unchanged)
const postSearchSchema = Joi.object({
  name:Joi.string().optional(),
  city: Joi.string().optional(),
  town: Joi.string().optional(),
  address: Joi.string().optional(),
  skills:Joi.string().optional(),
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
  name: Joi.string().optional(), // Changed to optional to match schema
  phone: Joi.string().optional(),
  address: Joi.string().optional(),
  latitude: Joi.number().optional(), // Added
  longitude: Joi.number().optional(), // Added
  skills: Joi.array().items(Joi.string()).optional(),
  features: Joi.array().items(Joi.string()).optional(),
  city: Joi.string().required(),
  town: Joi.string().required(),
  experience: Joi.number().required().min(0),
  logo: Joi.string().optional(),
});
const geocodeAddress = async (address) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        placeId: result.place_id
      };
    }
    throw new Error('Address not found');
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
};
// controllers/profileController.js
exports.createProfile = async (req, res) => {
  try {
    console.log('req.user:', req.user);
    console.log('userId:', req.user?.userId);

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

    const existingProfile = await Profile.findOne({ userId: req.user.userId });
    if (existingProfile) return res.status(400).json({ message: 'Profile already exists' });

    const { skills, features, address, name, phone, city, town, experience, logo } = req.body;

    // Geocode the address
    let geocodedData;
    try {
      geocodedData = await geocodeAddress(address);
    } catch (geocodeError) {
      return res.status(400).json({ message: 'Invalid address: ' + geocodeError.message });
    }

    let logoUrl = '';
    if (logo) {
      try {
        const base64Data = logo.replace(/^data:image\/\w+;base64,/, '');
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

    const profile = new Profile({
      userId: req.user.userId,
      name,
      phone,
      city,
      town,
      address:geocodedData.formattedAddress,
      latitude: geocodedData.latitude,
      longitude: geocodedData.longitude,
      formattedAddress: geocodedData.formattedAddress,
      placeId: geocodedData.placeId,
      experience,
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
      user.profileImage = logoUrl;
    } catch (uploadError) {
      return res.status(500).json({ message: 'Failed to upload logo', error: uploadError.message });
    }
  }

  try {
    if (req.body.name) {
      user.name = req.body.name;
    }
    await user.save();

    profile.name = req.body.name || profile.name;
    profile.phone = req.body.phone || profile.phone;
    profile.address = req.body.address || profile.address;
    profile.latitude = req.body.latitude || profile.latitude; // Added
    profile.longitude = req.body.longitude || profile.longitude; // Added
    profile.skills = req.body.skills || profile.skills;
    profile.features = req.body.features || profile.features;
    profile.experience = req.body.experience || profile.experience;
    profile.city = req.body.city || profile.city;
    profile.town = req.body.town || profile.town;
    profile.logo = logoUrl;

    await profile.save();

    const mergedProfile = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      profileImage: user.profileImage,
      skills: profile.skills,
      experience: profile.experience,
      callCount: profile.callCount,
      city: profile.city,
      town: profile.town,
      address: profile.address,
      latitude: profile.latitude, // Added
      longitude: profile.longitude, // Added
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

    const { city, town, skills, category, name } = req.query;
    console.log('Query parameters:', req.query);

    // Build dynamic match stage
    let matchStage = {};
    
    if (city) {
      matchStage['profile.city'] = { $regex: city, $options: 'i' }; // Partial match
    }
    
    if (town) {
      matchStage['profile.town'] = { $regex: town, $options: 'i' }; // Partial match for town
    }
    
    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
      matchStage['profile.skills'] = { $in: skillArray.map(s => new RegExp(s, 'i')) };
    }
    
    if (category) {
      matchStage['category'] = { $regex: category, $options: 'i' }; // Match post category
    }
    
    if (name) {
      matchStage['user.name'] = { $regex: name, $options: 'i' }; // Partial match for user name
    }

    // Ensure at least one search parameter is provided
    if (Object.keys(matchStage).length === 0) {
      return res.status(400).json({ 
        message: 'At least one search parameter (city, town, skills, category, or name) is required' 
      });
    }

    const posts = await Post.aggregate([
      // Lookup for users
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, // Allow posts without users
      
      // Lookup for profiles
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } }, // Allow posts without profiles
      
      // Lookup for reviews
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      
      // Apply the match stage after all lookups are complete
      { $match: matchStage },
      
      // Project relevant fields and compute average rating
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          category: 1,
          createdAt: 1,
          user: {
            _id: '$user._id',
            name: '$user.name',
            role: '$user.role',
          },
          profile: {
            city: '$profile.city',
            town: '$profile.town',
            skills: '$profile.skills',
            verificationStatus: '$profile.verificationStatus',
            profileImage: '$profile.logo', // Include profile image
          },
          rating: {
            $cond: {
              if: { $eq: [{ $size: '$reviews' }, 0] }, // Check if reviews array is empty
              then: null,
              else: { $avg: '$reviews.rating' }, // Calculate average rating
            },
          },
          reviews: {
            $cond: {
              if: { $eq: [{ $size: '$reviews' }, 0] }, // Check if reviews array is empty
              then: [],
              else: '$reviews', // Include all reviews
            },
          },
        },
      },
      
      // Sort by newest first
      { $sort: { createdAt: -1 } },
    ]);

    console.log('Found posts:', posts.length);
    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found matching the criteria' });
    }

    res.json(posts);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ message: 'Error performing query', error: err.message });
  }
};

