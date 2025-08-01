// routes/featuresRoutes.js
const express = require('express');
const router = express.Router();
const featuresController = require('../controllers/featuresController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/add', [authMiddleware, roleMiddleware(['thekadar', 'small_consultant', 'large_consultant'])], featuresController.addFeatures);

module.exports = router;