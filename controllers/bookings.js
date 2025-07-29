// E:\theekadar-api\controllers\bookings.js
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { sendNotification } = require('../utils/pusher');

const createBooking = async (req, res) => {
  const { serviceId, scheduledTime, duration } = req.body;

  try {
    const service = await Service.findById(serviceId).populate('workerId thekedarId');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const totalPrice = service.hourlyRate * duration;
    const booking = new Booking({
      clientId: req.user.id,
      workerId: service.workerId,
      thekedarId: service.thekedarId || null,
      serviceId,
      scheduledTime,
      duration,
      totalPrice,
    });

    await booking.save();

    await sendNotification(
      service.workerId._id,
      `New booking request from ${req.user.name}`,
      'booking'
    );
    if (service.thekedarId) {
      await sendNotification(
        service.thekedarId._id,
        `New booking for service (${service.category}) assigned to your worker`,
        'booking'
      );
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBookings = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    let query = {};
    if (req.user.role === 'client') {
      query.clientId = req.user.id;
    } else if (req.user.role === 'worker') {
      query.workerId = req.user.id;
    } else if (req.user.role === 'thekedar') {
      query.thekedarId = req.user.id;
    } // Admins see all bookings

    const totalItems = await Booking.countDocuments(query);
    const bookings = await Booking.find(query)
      .populate('clientId', 'name email')
      .populate('workerId', 'name email')
      .populate('serviceId', 'category description')
      .skip(skip)
      .limit(limitNum);

    res.json({
      data: bookings,
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

const updateBookingStatus = async (req, res) => {
  const { bookingId, status } = req.body;

  try {
    const booking = await Booking.findById(bookingId).populate('serviceId');
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user.id && 
        booking.thekedarId?.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    booking.status = status;
    await booking.save();

    await sendNotification(
      booking.clientId,
      `Booking status updated to ${status}`,
      'status'
    );
    if (booking.thekedarId && booking.thekedarId.toString() !== req.user.id) {
      await sendNotification(
        booking.thekedarId,
        `Booking status updated to ${status} for service (${booking.serviceId.category})`,
        'status'
      );
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = { createBooking, updateBookingStatus, getBookings };

