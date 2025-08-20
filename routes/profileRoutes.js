// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const User = require('../models/User');
const Profile = require('../models/profile');
const Post = require('../models/Post');
const { authMiddleware } = require('../middleware/auth');

const axios = require('axios');


const mongoose = require('mongoose');


router.post('/create', authMiddleware, profileController.createProfile);
router.post('/update',authMiddleware,profileController.updateProfile);
router.post('/call/:userId', authMiddleware, profileController.incrementCallCount);
router.get('/call/:userId', authMiddleware, profileController.getCallCount);
router.get('/near', authMiddleware, profileController.findProfilesNear); // New endpoint
// GET /api/profile/exists/:userId

router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('userId', 'name email');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profiles', error: error.message });
  }
});
router.get('/exists/:userId',authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate userId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if profile exists
    const profileExists = await Profile.exists({ userId });
    
    // Return true if profile exists, false otherwise
    res.json(!!profileExists);
  } catch (error) {
    console.error('Error checking profile existence:', error);
    res.status(500).json({ error: 'Server error' });
  }
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

// Search addresses using Google Places API
// Enhanced search-address route
router.get('/search-address', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({ message: 'Query parameter is required and must be at least 3 characters' });
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
      params: {
        input: query,
        key: process.env.GOOGLE_MAPS_API_KEY,
        types: 'address'
      }
    });

    if (response.data.status === 'OK') {
      const predictions = response.data.predictions.map(prediction => ({
        description: prediction.description,
        placeId: prediction.place_id
      }));
      res.json(predictions);
    } else {
      res.status(400).json({ message: 'Address search failed: ' + response.data.status });
    }
  } catch (error) {
    console.error('Address search error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
// Get place details for selected address
router.get('/place-details/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id: placeId,
        key: process.env.GOOGLE_MAPS_API_KEY,
        fields: 'geometry,formatted_address'
      }
    });

    if (response.data.status === 'OK') {
      const result = response.data.result;
      res.json({
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address
      });
    } else {
      res.status(400).json({ message: 'Place details not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create profile with address geocoding
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
      address,
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

// Get all profiles with coordinates for map
router.get('/map-profiles', async (req, res) => {
  try {
    const profiles = await Profile.find({ 
      verificationStatus: 'approved',
      latitude: { $exists: true },
      longitude: { $exists: true }
    }).populate('userId', 'name email');

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profiles', error: error.message });
  }
});
module.exports = router;