const Joi = require('joi');
const formidable = require('formidable');
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
});

exports.createPost = async (req, res) => {
  // Initialize formidable with file size limit (5MB)
  const form = new formidable.IncomingForm({
    multiples: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB limit
  });

  try {
    // Parse the incoming request
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Convert fields to a plain object for Joi validation
    const body = {};
    for (const key in fields) {
      body[key] = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
    }

    // Validate request body
    const { error } = postSchema.validate(body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    // Check if user is verified
    const user = await User.findById(req.user.userId).lean(); // Use lean for faster query
    if (!user.isVerified) return res.status(403).json({ message: 'User not verified' });

    // Handle file uploads (sequential, max 5 files)
    let imageUrls = [];
    if (files.images) {
      const images = Array.isArray(files.images) ? files.images : [files.images];
      if (images.length > 5) {
        return res.status(400).json({ message: 'Maximum 5 images allowed' });
      }
      for (const file of images) {
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: 'Only image files are allowed' });
        }
        const fileData = {
          buffer: file.buffer,
          name: file.originalFilename,
          mimetype: file.mimetype,
          size: file.size,
        };
        const url = await uploadFile(fileData); // Sequential upload
        imageUrls.push(url);
      }
    }

    // Create new post
    const post = new Post({
      userId: req.user.userId,
      title: body.title,
      description: body.description,
      category: body.category,
      images: imageUrls,
      hourlyRate: body.hourlyRate,
      availability: body.availability,
      serviceType: body.serviceType,
      projectScale: body.projectScale,
      certifications: body.certifications,
    });

    await post.save();
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    if (error.name === 'FileTooLargeError') {
      return res.status(400).json({ message: 'File size exceeds 5MB limit' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).lean();
    let posts;

    if (user.role === 'client') {
      posts = await Post.find().populate('userId', 'role').lean();
    } else if (user.role === 'worker') {
      posts = await Post.find({ 'userId.role': { $in: ['client', 'thekadar', 'small_consultant', 'large_consultant'] } })
        .populate('userId', 'role')
        .lean();
    } else {
      posts = await Post.find({ 'userId.role': { $in: ['client', 'worker'] } })
        .populate('userId', 'role')
        .lean();
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};