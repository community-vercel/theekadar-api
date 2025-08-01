// routes/postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authMiddleware } = require('../middleware/auth');

router.post('/create', authMiddleware, postController.createPost);
router.get('/all', authMiddleware, postController.getAllPosts);

module.exports = router;