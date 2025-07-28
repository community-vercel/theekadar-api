// E:\theekadar-api\routes\bookings.js
const express = require('express');
const router = express.Router();
const { createBooking, updateBookingStatus,getBookings } = require('../controllers/bookings');
const { validate, bookingSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/', auth(['client']), validate(bookingSchema), createBooking);
router.put('/status', auth(['worker', 'admin']), updateBookingStatus);
router.get('/', auth(['client', 'worker', 'admin']), getBookings);


module.exports = router;