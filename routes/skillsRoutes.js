// routes/skillsRoutes.js
const express = require('express');
const router = express.Router();
const skillsController = require('../controllers/skillsController');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.post('/add', [authMiddleware, roleMiddleware(['worker'])], skillsController.addSkills);

module.exports = router;