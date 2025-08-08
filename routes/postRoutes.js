// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/auth');
const Post = require('../models/Post');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Profile = require('../models/profile');

// Middleware to parse raw file data
const parseFormData = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    let data = '';
    let boundary;
    
    // Extract boundary from content-type header
    const contentType = req.headers['content-type'];
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (boundaryMatch) {
      boundary = '--' + boundaryMatch[1];
    }

    req.setEncoding('binary');
    
    req.on('data', chunk => {
      data += chunk;
    });
    
    req.on('end', () => {
      try {
        const parts = data.split(boundary);
        req.body = {};
        req.files = [];
        
        parts.forEach(part => {
          if (part.trim() === '' || part.trim() === '--') return;
          
          const [headers, content] = part.split('\r\n\r\n');
          if (!headers || !content) return;
          
          const nameMatch = headers.match(/name="([^"]+)"/);
          const filenameMatch = headers.match(/filename="([^"]+)"/);
          const contentTypeMatch = headers.match(/Content-Type: (.+)/);
          
          if (nameMatch) {
            const fieldName = nameMatch[1];
            
            if (filenameMatch && contentTypeMatch) {
              // This is a file
              const filename = filenameMatch[1];
              const contentType = contentTypeMatch[1].trim();
              const fileContent = content.substring(0, content.length - 2); // Remove \r\n at end
              
              req.files.push({
                fieldname: fieldName,
                originalname: filename,
                mimetype: contentType,
                buffer: Buffer.from(fileContent, 'binary'),
                size: Buffer.byteLength(fileContent, 'binary')
              });
            } else {
              // This is a regular field
              const value = content.substring(0, content.length - 2).trim();
              
              // Handle arrays (like certifications)
              if (req.body[fieldName]) {
                if (Array.isArray(req.body[fieldName])) {
                  req.body[fieldName].push(value);
                } else {
                  req.body[fieldName] = [req.body[fieldName], value];
                }
              } else {
                req.body[fieldName] = value;
              }
            }
          }
        });
        
        console.log('Parsed body:', req.body);
        console.log('Parsed files:', req.files.map(f => ({ name: f.originalname, size: f.size })));
        next();
      } catch (error) {
        console.error('Form parsing error:', error);
        res.status(400).json({ message: 'Invalid form data' });
      }
    });
  } else {
    next();
  }
};

router.post('/create', authMiddleware, parseFormData, postController.createPost);
router.get('/all', authMiddleware, postController.getAllPosts);

router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const posts = await Post.find({ category })
      .populate({
        path: 'userId',
        select: 'name email phone role isVerified',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'logo skills experience callCount city town address verificationStatus rating',
        },
      })
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments({ category });

    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      description: post.description,
      category: post.category,
      images: post.images,
      hourlyRate: post.hourlyRate,
      availability: post.availability,
      serviceType: post.serviceType,
      projectScale: post.projectScale,
      certifications: post.certifications,
      createdAt: post.createdAt,
      userId: {
        _id: post.userId._id,
        name: post.userId.name,
        email: post.userId.email,
        phone: post.userId.phone,
        role: post.userId.role,
        isVerified: post.userId.isVerified,
        profileImage: post.userId.profile ? post.userId.profile.logo : null,
        rating: post.userId.profile ? post.userId.profile.rating : null,
        skills: post.userId.profile ? post.userId.profile.skills : null,
        experience: post.userId.profile ? post.userId.profile.experience : null,
        callCount: post.userId.profile ? post.userId.profile.callCount : 0,
        city: post.userId.profile ? post.userId.profile.city : null,
        town: post.userId.profile ? post.userId.profile.town : null,
        address: post.userId.profile ? post.userId.profile.address : null,
        verificationStatus: post.userId.profile ? post.userId.profile.verificationStatus : null,
      },
    }));

    res.status(200).json({
      posts: formattedPosts,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;