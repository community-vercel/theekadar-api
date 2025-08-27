const Thekedar = require('../models/Thekedar');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const { uploadToVercelBlob } = require('../utils/blob');
const { sendNotification } = require('../utils/pusher');

const createThekedarProfile = async (req, res) => {
  const { companyName, experience, certifications, location } = req.body;
  const profileImage = req.files?.profileImage;

  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'thekedar') {
      return res.status(403).json({ error: 'Only thekedars can create profiles' });
    }
    if (!user.isVerified) {
      return res.status(403).json({ error: 'User verification pending' });
    }

    let profileImageUrl;
    if (profileImage) {
      profileImageUrl = await uploadToVercelBlob(
        profileImage.data,
        `${req.user.id}-thekedar-profile-${Date.now()}`
      );
    }

    const thekedar = new Thekedar({
      user: req.user.id,
      companyName,
      experience,
      certifications: certifications || [],
      location: location || user.location, // Use user.location if provided
      profileImage: profileImageUrl,
    });

    await thekedar.save();
    res.status(201).json(thekedar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getThekedarProfile = async (req, res) => {
  try {
    const thekedar = await Thekedar.findOne({ user: req.user.id })
      .populate('user', 'name email phone')
      .populate('workers', 'skills experience hourlyRate');
    if (!thekedar) {
      return res.status(404).json({ error: 'Thekedar profile not found' });
    }
    res.json(thekedar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addWorkerToTeam = async (req, res) => {
  const { workerId } = req.body;

  try {
    const thekedar = await Thekedar.findOne({ user: req.user.id });
    if (!thekedar) {
      return res.status(404).json({ error: 'Thekedar profile not found' });
    }

    const worker = await Worker.findById(workerId).populate('user');
    if (!worker || worker.user.role !== 'worker') {
      return res.status(404).json({ error: 'Worker not found' });
    }

    if (thekedar.workers.includes(workerId)) {
      return res.status(400).json({ error: 'Worker already in team' });
    }

    thekedar.workers.push(workerId);
    await thekedar.save();
    await sendNotification(worker.user._id, `You have been added to ${thekedar.companyName}'s team`, 'general');
    res.json({ message: 'Worker added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const removeWorkerFromTeam = async (req, res) => {
  const { workerId } = req.body;

  try {
    const thekedar = await Thekedar.findOne({ user: req.user.id });
    if (!thekedar) {
      return res.status(404).json({ error: 'Thekedar profile not found' });
    }

    if (!thekedar.workers.includes(workerId)) {
      return res.status(400).json({ error: 'Worker not in team' });
    }

    thekedar.workers = thekedar.workers.filter(id => id.toString() !== workerId);
    await thekedar.save();
    const worker = await Worker.findById(workerId).populate('user');
    await sendNotification(worker.user._id, `You have been removed from ${thekedar.companyName}'s team`, 'general');
    res.json({ message: 'Worker removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const assignServiceToWorker = async (req, res) => {
  const { workerId, serviceId } = req.body;

  try {
    const thekedar = await Thekedar.findOne({ user: req.user.id });
    if (!thekedar) {
      return res.status(404).json({ error: 'Thekedar profile not found' });
    }

    if (!thekedar.workers.includes(workerId)) {
      return res.status(403).json({ error: 'Worker not in your team' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.workerId.toString() !== workerId || service.thekedarId?.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    service.thekedarId = req.user.id;
    await service.save();
    await sendNotification(workerId, `Service (${service.category}) assigned to you by ${thekedar.companyName}`, 'general');
    res.json({ message: 'Service assigned successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getThekedarBookings = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const thekedar = await Thekedar.findOne({ user: req.user.id });
    if (!thekedar) {
      return res.status(404).json({ error: 'Thekedar profile not found' });
    }

    const query = { thekedarId: req.user.id };
    const totalItems = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('clientId', 'name email')
      .populate('workerId', 'name email')
      .populate('serviceId', 'category description')
      .skip(skip)
      .limit(limitNum);

    res.json | {
      data: bookings,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        limit: limitNum,
      },
    };
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createThekedarProfile, getThekedarProfile, addWorkerToTeam, removeWorkerFromTeam, assignServiceToWorker, getThekedarBookings };