// E:\theekadar-api\controllers\bookings.js
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { sendNotification } = require('../utils/pusher');

const createBooking = async (req, res) => {
  const { serviceId, scheduledTime, duration } = req.body;

  try {
    const service = await Service.findById(serviceId).populate('workerId');
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const totalPrice = service.hourlyRate * duration;
    const booking = new Booking({
      clientId: req.user.id,
      workerId: service.workerId,
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

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  const { bookingId, status } = req.body;

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.workerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    booking.status = status;
    await booking.save();

    await sendNotification(
      booking.clientId,
      `Booking status updated to ${status}`,
      'status'
    );

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createBooking, updateBookingStatus };