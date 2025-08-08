// controllers/postController.js
const Joi = require('joi');
const User = require('../models/User');
const Post = require('../models/Post');
const { put } = require('@vercel/blob');

const postSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().required(),
  hourlyRate: Joi.number().optional(),
  availability: Joi.boolean().default(true),
  serviceType: Joi.string().valid('general', 'specialized', 'emergency', 'long_term').optional(),
  projectScale: Joi.string().valid('small', 'medium', 'large').optional(),
  certifications: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  images: Joi.array().items(Joi.string()).optional(), // Now expects URLs from client
});

// New endpoint for direct file upload
exports.uploadImage = async (req, res) => {
  try {
    if (!req.body || !req.body.file) {
      return res.status(400).json({ message: 'No file data provided' });
    }

    const { file, filename, contentType } = req.body;
    
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ message: 'Blob token not configured' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file, 'base64');
    
    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;

    const { url } = await put(uniqueFilename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: contentType || 'image/jpeg',
    });

    console.log('File uploaded successfully:', url);
    res.json({ url });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

exports.createPost = async (req, res) => {
  try {
    const { error } = postSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findById(req.user.userId);
    if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

    const post = new Post({
      userId: req.user.userId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      images: req.body.images || [], // Array of URLs uploaded by client
      hourlyRate: req.body.hourlyRate,
      availability: req.body.availability,
      serviceType: req.body.serviceType,
      projectScale: req.body.projectScale,
      certifications: Array.isArray(req.body.certifications) 
        ? req.body.certifications 
        : req.body.certifications ? [req.body.certifications] : [],
    });

    await post.save();
    console.log('Post saved with images:', post.images);
    res.status(201).json(post);
    
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    let posts;

    if (user.role === 'client') {
      posts = await Post.find().populate('userId', 'role');
    } else if (user.role === 'worker') {
      posts = await Post.find().populate('userId', 'role')
        .populate({
          path: 'userId',
          match: { role: { $in: ['client', 'thekadar', 'small_consultant', 'large_consultant'] } }
        });
      posts = posts.filter(post => post.userId);
    } else {
      posts = await Post.find().populate('userId', 'role')
        .populate({
          path: 'userId',
          match: { role: { $in: ['client', 'worker'] } }
        });
      posts = posts.filter(post => post.userId);
    }

    res.json(posts);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};