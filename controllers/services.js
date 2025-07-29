// E:\theekadar-api\controllers\services.js
const Service = require('../models/Service');
const Worker = require('../models/Worker');
const { sendNotification } = require('../utils/pusher');

const createService = async (req, res) => {
  const { category, description, hourlyRate, availability, location, workerId } = req.body;

  try {
    let userId = req.user.id;
    let roleCheck = req.user.role === 'worker';
    let worker;

    if (req.user.role === 'thekedar') {
      const thekedar = await Thekedar.findOne({ user: req.user.id });
      if (!thekedar) {
        return res.status(404).json({ error: 'Thekedar profile not found' });
      }
      if (!workerId || !thekedar.workers.includes(workerId)) {
        return res.status(403).json({ error: 'Worker not in your team' });
      }
      userId = workerId;
      worker = await Worker.findById(workerId);
      roleCheck = true;
    } else {
      worker = await Worker.findOne({ user: req.user.id });
    }

    if (!worker) {
      return res.status(403).json({ error: 'Worker profile not found' });
    }

    const service = new Service({
      workerId: userId,
      thekedarId: req.user.role === 'thekedar' ? req.user.id : null,
      category,
      description,
      hourlyRate,
      availability,
      location,
    });

    await service.save();
    await sendNotification(userId, `New service (${category}) created`, 'general');
    if (req.user.role === 'thekedar') {
      await sendNotification(req.user.id, `Service (${category}) created for worker`, 'general');
    }
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateService = async (req, res) => {
  const { serviceId, category, description, hourlyRate, availability, location } = req.body;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.workerId.toString() !== req.user.id && 
        service.thekedarId?.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    service.category = category || service.category;
    service.description = description || service.description;
    service.hourlyRate = hourlyRate || service.hourlyRate;
    service.availability = availability || service.availability;
    service.location = location || service.location;

    await service.save();
    await sendNotification(req.user.id, `Service (${service.category}) updated`, 'general');
    res.json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteService = async (req, res) => {
  const { serviceId } = req.params;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.workerId.toString() !== req.user.id && 
        service.thekedarId?.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await service.deleteOne();
    await sendNotification(req.user.id, `Service (${service.category}) deleted`, 'general');
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const searchServices = async (req, res) => {
  const { category, lat, lng, maxDistance, page = 1, limit = 10 } = req.query;

  try {
    const query = {};
    if (category) {
      query.category = category;
    }

    if (lat && lng && maxDistance) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], parseFloat(maxDistance) / 6378.1],
        },
      };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalItems = await Service.countDocuments(query);
    const services = await Service.find(query)
      .populate('workerId', 'name phone')
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: services,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createService, updateService, deleteService, searchServices };