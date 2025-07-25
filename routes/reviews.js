// E:\theekadar-api\routes\reviews.js
const express = require('express');
const router = express.Router();
const { submitReview, getReviews } = require('../controllers/reviews');
const { validate, reviewSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/', auth(['client']), validate(reviewSchema), submitReview);
router.get('/:serviceId', getReviews); // Public route for viewing reviews

module.exports = router;