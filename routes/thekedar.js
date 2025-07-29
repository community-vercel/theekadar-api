const express = require('express');
const router = express.Router();
const { createThekedarProfile, getThekedarProfile, addWorkerToTeam, removeWorkerFromTeam, assignServiceToWorker, getThekedarBookings } = require('../controllers/thekedar');
const { validate, thekedarSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/profile', auth(['thekedar']), validate(thekedarSchema), createThekedarProfile);
router.get('/profile', auth(['thekedar']), getThekedarProfile);
router.post('/add-worker', auth(['thekedar']), addWorkerToTeam);
router.post('/remove-worker', auth(['thekedar']), removeWorkerFromTeam);
router.post('/assign-service', auth(['thekedar']), assignServiceToWorker);
router.get('/bookings', auth(['thekedar']), getThekedarBookings);

module.exports = router;