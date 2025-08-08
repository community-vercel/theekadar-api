// controllers/postController.js
const Joi = require('joi');
const User = require('../models/User');
const Post = require('../models/Post');
const { put } = require('@vercel/blob');
const Profile = require('../models/profile');
const Review = require('../models/Review');
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
exports.getTopPosts = async (req, res) => {
  try {
    // Aggregate posts with profile and review data
    const posts = await Post.aggregate([
      // Lookup Profile to get callCount and logo
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      // Lookup Reviews to calculate average rating
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      // Project fields and calculate average rating
      {
        $project: {
          _id: 1,
          userId: 1,
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
          callCount: { $ifNull: ['$profile.callCount', 0] },
          averageRating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $avg: '$reviews.rating' },
              else: 0,
            },
          },
        },
      },
      // Lookup User for user details
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Project final fields and calculate weighted score
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
          callCount: 1,
          averageRating: { $round: ['$averageRating', 1] },
          weightedScore: {
            $add: [
              { $multiply: [{ $divide: ['$callCount', 100] }, 0.5] }, // Normalize callCount
              { $multiply: ['$averageRating', 0.1] }, // Scale rating
            ],
          },
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            phone: '$user.phone',
            role: '$user.role',
            isVerified: '$user.isVerified',
            createdAt: '$user.createdAt',
          },
          profileImage: { $ifNull: ['$profile.logo', null] }, // Map logo to profileImage
          skills: { $ifNull: ['$profile.skills', null] },
          experience: { $ifNull: ['$profile.experience', null] },
          city: { $ifNull: ['$profile.city', null] },
          town: { $ifNull: ['$profile.town', null] },
          address: { $ifNull: ['$profile.address', null] },
          verificationStatus: { $ifNull: ['$profile.verificationStatus', null] },
        },
      },
      // Sort by weighted score (descending) and limit to 10
      { $sort: { weightedScore: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      message: 'Top 10 posts retrieved successfully',
      data: posts,
    });
  } catch (error) {
    console.error('Get top posts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
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