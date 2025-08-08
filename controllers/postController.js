// controllers/postController.js
const Joi = require('joi');
const User = require('../models/User');
const Post = require('../models/Post');
const { uploadFile } = require('../utils/vercelBlob');

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
  images: Joi.array().items(Joi.string()).optional(),
});

exports.createPost = async (req, res) => {
  try {
    const { error } = postSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findById(req.user.userId);
    if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

    // Fixed file processing logic
    let files = [];
    
    if (req.files) {
      console.log('req.files:', req.files); // Debug log
      
      if (Array.isArray(req.files)) {
        // When using upload.array('images')
        files = req.files;
      } else if (req.files.images) {
        // When using upload.fields([{ name: 'images' }])
        files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      } else if (typeof req.files === 'object') {
        // When using upload.single('image') or other field names
        files = Object.values(req.files).flat();
      }
    }

    console.log('Processed files:', files); // Debug log

    // Upload files to Vercel Blob
    const imageUrls = [];
    if (files && files.length > 0) {
      try {
        const uploadPromises = files.map(file => uploadFile(file));
        const urls = await Promise.all(uploadPromises);
        imageUrls.push(...urls);
        console.log('Uploaded image URLs:', imageUrls); // Debug log
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ message: 'File upload failed', error: uploadError.message });
      }
    }

    const post = new Post({
      userId: req.user.userId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      images: imageUrls, // This will be an array of URLs or empty array
      hourlyRate: req.body.hourlyRate,
      availability: req.body.availability,
      serviceType: req.body.serviceType,
      projectScale: req.body.projectScale,
      certifications: Array.isArray(req.body.certifications) 
        ? req.body.certifications 
        : req.body.certifications ? [req.body.certifications] : [],
    });

    await post.save();
    console.log('Post saved with images:', post.images); // Debug log
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
      // Filter out posts where userId is null (didn't match the condition)
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