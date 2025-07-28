// E:\theekadar-api\controllers\reviews.js
const Service = require('../models/Service');
const { sendNotification } = require('../utils/pusher');

const submitReview = async (req, res) => {
  const { serviceId, rating, review } = req.body;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if user has a completed booking for this service
    const booking = await Booking.findOne({
      clientId: req.user.id,
      serviceId,
      status: 'completed',
    });
    if (!booking) {
      return res.status(403).json({ error: 'No completed booking found for this service' });
    }

    // Check if user already reviewed this service
    const existingReview = service.ratings.find(
      (r) => r.clientId.toString() === req.user.id
    );
    if (existingReview) {
      return res.status(400).json({ error: 'You have already reviewed this service' });
    }

    service.ratings.push({
      clientId: req.user.id,
      rating,
      review,
    });

    // Update average rating
    const totalRatings = service.ratings.length;
    const sumRatings = service.ratings.reduce((sum, r) => sum + r.rating, 0);
    service.averageRating = sumRatings / totalRatings;

    await service.save();
    await sendNotification(
      service.workerId,
      `New review (${rating}/5) for your service: ${service.category}`,
      'general'
    );
    res.json({ message: 'Review submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReviews = async (req, res) => {
  const { serviceId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const totalItems = service.ratings.length;
    const paginatedRatings = service.ratings.slice(skip, skip + limitNum);

    res.json({
      data: paginatedRatings,
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

module.exports = { submitReview, getReviews };