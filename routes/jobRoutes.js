// routes/jobRoutes.js
const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, jobController.createJob);
router.get('/:jobId', jobController.getJob);
router.get('/', jobController.getAllJobs);
router.put('/:jobId', authMiddleware, jobController.updateJob);
router.delete('/:jobId', authMiddleware, jobController.deleteJob);
router.get('/:userId',authMiddleware, jobController.getUserJobs); // New endpoint for jobs

module.exports = router;