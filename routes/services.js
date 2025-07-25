// E:\theekadar-api\routes\services.js
const express = require('express');
const router = express.Router();
const { createService, updateService, deleteService, searchServices } = require('../controllers/services');
const { validate, serviceSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/', auth(['worker']), validate(serviceSchema), createService);
router.put('/', auth(['worker', 'admin']), validate(serviceSchema), updateService);
router.delete('/:serviceId', auth(['worker', 'admin']), deleteService);
router.get('/search', searchServices); // Public route for searching services

module.exports = router;