// E:\theekadar-api\routes\worker.js
const express = require('express');
const router = express.Router();
const { createWorkerProfile, getWorkerProfile,getWorkers } = require('../controllers/worker');
const { validate, workerSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/profile', auth(['worker']), validate(workerSchema), createWorkerProfile);
router.get('/profile', auth(['worker']), getWorkerProfile);
router.get('/', auth(['client', 'admin']), getWorkers);


module.exports = router;