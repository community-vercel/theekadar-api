// controllers/postController.js
const Joi = require('joi');
const User = require('../models/User');
const Post = require('../models/Post');
const { put } = require('@vercel/blob');
const Profile = require('../models/profile');
const Review = require('../models/Review');
const mongoose = require('mongoose');

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
    const posts = await Post.aggregate([
      // Lookup Profile for logo, address, experience, callCount
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      // Lookup Reviews for average rating
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      // Lookup User for name
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // Project required fields and calculate average rating
      {
        $project: {
          postId: '$_id',
          postName: '$title',
          description: '$description',
          name: '$user.name',
          userid:'$user._id',
          profileImage: { $ifNull: ['$profile.logo', null] },
          address: { $ifNull: ['$profile.address', null] },
          experience: { $ifNull: ['$profile.experience', null] },
          rating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $round: [{ $avg: '$reviews.rating' }, 1] },
              else: null,
            },
          },
          callCount: { $ifNull: ['$profile.callCount', 0] },
          weightedScore: {
            $add: [
              { $multiply: [{ $divide: [{ $ifNull: ['$profile.callCount', 0] }, 100] }, 0.5] }, // Normalize callCount
              { $multiply: [
                { $cond: {
                  if: { $gt: [{ $size: '$reviews' }, 0] },
                  then: { $avg: '$reviews.rating' },
                  else: 0,
                } },
                0.1
              ] }, // Scale rating
            ],
          },
        },
      },
      // Sort by weighted score (descending) and limit to 10
      { $sort: { weightedScore: -1 } },
      { $limit: 50 },
    ]);

    res.status(200).json({
      success: true,
      message: 'Top 50 posts retrieved successfully',
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

exports.getPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }

    const post = await Post.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(postId) } },
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          postId: '$_id',
          postName: '$title',
          name: '$user.name',
          profileImage: { $ifNull: ['$profile.logo', null] },
          address: { $ifNull: ['$profile.address', null] },
           latitude:  { $ifNull: ['$profile.longitude', null] },
          longitude:{ $ifNull: ['$profile.longitude', null] },
          experience: { $ifNull: ['$profile.experience', null] },
          rating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $round: [{ $avg: '$reviews.rating' }, 1] },
              else: null,
            },
          },
          description: 1,
          category: 1,
          images: 1,
          hourlyRate: 1,
          availability: 1,
          serviceType: 1,
          projectScale: 1,
          certifications: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!post.length) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Post retrieved successfully',
      data: post[0],
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, description, category, images, hourlyRate, availability, serviceType, projectScale, certifications } = req.body;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this post' });
    }

    let imageUrls = post.images || [];

    // Handle new image uploads if images are provided
    if (images && Array.isArray(images)) {
      try {
        // Delete existing images if they're being replaced
        if (imageUrls.length > 0) {
          // You might want to implement image deletion logic here
          // For Vercel Blob, you'd need to extract the file path and delete
          console.log('Old images would be deleted here:', imageUrls);
        }

        // Upload new images
        imageUrls = await Promise.all(
          images.map(async (base64Image, index) => {
            // Check if it's already a URL (in case of mixed update)
            if (typeof base64Image === 'string' && base64Image.startsWith('http')) {
              return base64Image;
            }
            
            // Remove base64 prefix
            const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            const fileName = `posts/${Date.now()}-${index}-${Math.random().toString(36).substring(7)}.jpg`;
            const { url } = await put(fileName, buffer, {
              access: 'public',
              token: process.env.VERCEL_BLOB_TOKEN,
            });
            return url;
          })
        );
      } catch (uploadError) {
        return res.status(500).json({ success: false, message: 'Failed to upload images', error: uploadError.message });
      }
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (images) updateData.images = imageUrls; // Use the processed image URLs
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (availability !== undefined) updateData.availability = availability;
    if (serviceType) updateData.serviceType = serviceType;
    if (projectScale) updateData.projectScale = projectScale;
    if (certifications) updateData.certifications = certifications;

    const updatedPost = await Post.findByIdAndUpdate(postId, { $set: updateData }, { new: true, runValidators: true });

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: updatedPost,
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.isValidObjectId(postId)) {
      return res.status(400).json({ success: false, message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this post' });
    }

    await Post.findByIdAndDelete(postId);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const posts = await Post.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: 'profiles',
          localField: 'userId',
          foreignField: 'userId',
          as: 'profile',
        },
      },
      { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'postId',
          as: 'reviews',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          postId: '$_id',
          postName: '$title',
          description: '$description',
          name: '$user.name',
          profileImage: { $ifNull: ['$profile.logo', null] },
           latitude:  { $ifNull: ['$profile.longitude', null] },
          longitude:{ $ifNull: ['$profile.longitude', null] },
          address: { $ifNull: ['$profile.address', null] },
          experience: { $ifNull: ['$profile.experience', null] },
          rating: {
            $cond: {
              if: { $gt: [{ $size: '$reviews' }, 0] },
              then: { $round: [{ $avg: '$reviews.rating' }, 1] },
              else: null,
            },
          },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'User posts retrieved successfully',
      data: posts,
    });
  } catch (error) {
    console.error('Get user posts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};