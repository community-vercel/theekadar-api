// controllers/jobController.js
const mongoose = require('mongoose');
const Job = require('../models/Job');
const User = require('../models/User');
const Profile = require('../models/profile');
const Joi = require('joi');

// Validation schema
const jobSchema = Joi.object({
  title: Joi.string().required().trim(),
  description: Joi.string().required().trim(),
  category: Joi.string().required(),
  budget: Joi.number().min(0).required(),
  location: Joi.object({
    city: Joi.string().required(),
    town: Joi.string().required(),
    address: Joi.string().optional(),
  }).required(),
  skillsRequired: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('open', 'in_progress', 'completed', 'cancelled').optional(),
});

exports.createJob = async (req, res) => {
  try {
    const { error } = jobSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const job = new Job({
      userId: req.user.userId,
      ...req.body,
    });

    await job.save();

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID' });
    }

    const job = await Job.findById(jobId)
      .lean()
      .populate({
        path: 'userId',
        select: 'name email phone role isVerified createdAt',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'logo skills experience callCount city town address verificationStatus',
        },
      });

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Job retrieved successfully',
      data: {
        _id: job._id,
        title: job.title,
        description: job.description,
        category: job.category,
        budget: job.budget,
        location: job.location,
        status: job.status,
        skillsRequired: job.skillsRequired,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        user: {
          _id: job.userId._id,
          name: job.userId.name,
          email: job.userId.email,
          phone: job.userId.phone,
          role: job.userId.role,
          isVerified: job.userId.isVerified,
          createdAt: job.userId.createdAt,
          profileImage: job.userId.profile ? job.userId.profile.logo : null,
          skills: job.userId.profile ? job.userId.profile.skills : null,
          experience: job.userId.profile ? job.userId.profile.experience : null,
          callCount: job.userId.profile ? job.userId.profile.callCount : 0,
          city: job.userId.profile ? job.userId.profile.city : null,
          town: job.userId.profile ? job.userId.profile.town : null,
          address: job.userId.profile ? job.userId.profile.address : null,
          verificationStatus: job.userId.profile ? job.userId.profile.verificationStatus : null,
        },
      },
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllJobs = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, city, status, sort = 'createdAt', order = 'desc' } = req.query;
    const query = {};

    if (category) query.category = category;
    if (city) query['location.city'] = city;
    if (status) query.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const jobs = await Job.find(query)
      .lean()
      .populate({
        path: 'userId',
        select: 'name email phone role isVerified',
        populate: {
          path: 'profile',
          model: 'Profile',
          select: 'logo city town verificationStatus',
        },
      })
      .sort({ [sort]: order === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Job.countDocuments(query);

    const formattedJobs = jobs.map(job => ({
      _id: job._id,
      title: job.title,
      description: job.description,
      category: job.category,
      budget: job.budget,
      location: job.location,
      status: job.status,
      skillsRequired: job.skillsRequired,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      user: {
        _id: job.userId._id,
        name: job.userId.name,
        email: job.userId.email,
        phone: job.userId.phone,
        role: job.userId.role,
        isVerified: job.userId.isVerified,
        profileImage: job.userId.profile ? job.userId.profile.logo : null,
        city: job.userId.profile ? job.userId.profile.city : null,
        town: job.userId.profile ? job.userId.profile.town : null,
        verificationStatus: job.userId.profile ? job.userId.profile.verificationStatus : null,
      },
    }));

    res.status(200).json({
      success: true,
      message: 'Jobs retrieved successfully',
      data: formattedJobs,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    console.error('Get all jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { error } = jobSchema.validate(req.body);
    if (error) return res.status(400).json({ success: false, message: error.details[0].message });

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this job' });
    }

    Object.assign(job, req.body);
    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!mongoose.isValidObjectId(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid job ID' });
    }

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (job.userId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this job' });
    }

    await Job.deleteOne({ _id: jobId });

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.getUserJobs = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const jobs = await Post.aggregate([
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
          name: '$user.name',
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
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'User jobs retrieved successfully',
      data: jobs,
    });
  } catch (error) {
    console.error('Get user jobs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};