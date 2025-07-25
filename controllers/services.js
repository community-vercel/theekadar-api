// E:\theekadar-api\controllers\services.js
const Service = require('../models/Service');
const Worker = require('../models/Worker');
const { sendNotification } = require('../utils/pusher');

const createService = async (req, res) => {
  const { category, description, hourlyRate, availability, location } = req.body;

  try {
    const worker = await Worker.findOne({ user: req.user.id });
    if (!worker) {
      return res.status(403).json({ error: 'Worker profile not found' });
    }

    const service = new Service({
      workerId: req.user.id,
      category,
      description,
      hourlyRate,
      availability,
      location,
    });

    await service.save();
    await sendNotification(req.user.id, `New service (${category}) created`, 'general');
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

    if (service.workerId.toString() !== req.user.id && req.user.role !== 'admin') {
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

    if (service.workerId.toString() !== req.user.id && req.user.role !== 'admin') {
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
  const { category, lat, lng, maxDistance } = req.query;

  try {
    const query = {};
    if (category) {
      query.category = category;
    }

    if (lat && lng && maxDistance) {
      query.location = {
        $geoWithin: {
          $centerSphere: [[parseFloat(lng), parseFloat(lat)], parseFloat(maxDistance) / 6378.1], // Convert km to radians
        },
      };
    }

    const services = await Service.find(query).populate('workerId', 'name phone');
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createService, updateService, deleteService, searchServices };