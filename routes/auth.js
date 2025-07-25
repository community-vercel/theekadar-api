// E:\theekadar-api\routes\auth.js
const express = require('express');
const router = express.Router();
const { register, login, uploadVerificationDocument } = require('../controllers/auth');
const { validate, userSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');

router.post('/register', validate(userSchema), register);
router.post('/login', login);
router.post('/verify-document', auth(['worker']), uploadVerificationDocument);

module.exports = router;