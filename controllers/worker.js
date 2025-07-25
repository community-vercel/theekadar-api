// E:\theekadar-api\controllers\worker.js
const Worker = require('../models/Worker');
const User = require('../models/User');
const { uploadToVercelBlob } = require('../utils/blob');

const createWorkerProfile = async (req, res) => {
  const { skills, experience, hourlyRate, location } = req.body;
  const profileImage = req.files?.profileImage;

  try {
    const user = await User.findById(req.user.id);
    if (user.role !== 'worker') {
      return res.status(403).json({ error: 'Only workers can create profiles' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'User verification pending' });
    }

    let profileImageUrl;
    if (profileImage) {
      profileImageUrl = await uploadToVercelBlob(
        profileImage.data,
        `${req.user.id}-profile-${Date.now()}`
      );
    }

    const worker = new Worker({
      user: req.user.id,
      skills,
      experience,
      hourlyRate,
      location,
      profileImage: profileImageUrl,
    });

    await worker.save();
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getWorkerProfile = async (req, res) => {
  try {
    const worker = await Worker.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!worker) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }
    res.json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createWorkerProfile, getWorkerProfile };