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
  images: Joi.array().items(Joi.string()).optional(), // Expect base64 strings or file data
});

exports.createPost = async (req, res) => {
  // Validate request body
  const { error } = postSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  // Check if user is verified
  const user = await User.findById(req.user.userId);
  if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

  let imageUrls = [];

  // Handle image uploads (assuming images are sent as base64 strings in req.body.images)
  if (req.body.images && Array.isArray(req.body.images)) {
    try {
      imageUrls = await Promise.all(
        req.body.images.map(async (base64Image, index) => {
          // Remove base64 prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `posts/${Date.now()}-${index}.jpg`; // Unique filename
          const { url } = await put(fileName, buffer, {
            access: 'public',
            token: process.env.VERCEL_BLOB_TOKEN,
          });
          return url;
        })
      );
    } catch (uploadError) {
      return res.status(500).json({ message: 'Failed to upload images', error: uploadError.message });
    }
  }

  // Create new post
  try {
    const post = new Post({
      userId: req.user.userId,
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      images: imageUrls,
      hourlyRate: req.body.hourlyRate,
      availability: req.body.availability,
      serviceType: req.body.serviceType,
      projectScale: req.body.projectScale,
      certifications: req.body.certifications,
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  const user = await User.findById(req.user.userId);
  let posts;

  if (user.role === 'client') {
    posts = await Post.find().populate('userId', 'role');
  } else if (user.role === 'worker') {
    posts = await Post.find({ 'userId.role': { $in: ['client', 'thekadar', 'small_consultant', 'large_consultant'] } }).populate('userId', 'role');
  } else {
    posts = await Post.find({ 'userId.role': { $in: ['client', 'worker'] } }).populate('userId', 'role');
  }

  res.json(posts);
};