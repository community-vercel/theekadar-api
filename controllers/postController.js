// controllers/postController.js
const Joi = require('joi');
const User = require('../models/User');
const Post = require('../models/Post');
const { uploadFile } = require('../utils/vercelBlob');

const postSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  category: Joi.string().valid('job_request', 'service_offering', 'consulting', 'contracting').required(),
  hourlyRate: Joi.number().optional(),
  availability: Joi.boolean().default(true),
  serviceType: Joi.string().valid('general', 'specialized', 'emergency', 'long_term').optional(),
  projectScale: Joi.string().valid('small', 'medium', 'large').optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
  projectScale: Joi.string().valid('small', 'medium', 'large').optional(),
  images: Joi.array().items(Joi.string()).optional(),
  certifications: Joi.array().items(Joi.string()).optional(),
});

exports.createPost = async (req, res) => {
  const { error } = postSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const user = await User.findById(req.user.userId);
  if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

  const imageUrls = await Promise.all(req.files.map(file => uploadFile(file)));
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