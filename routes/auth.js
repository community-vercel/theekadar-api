// E:\theekadar-api\routes\auth.js
const express = require('express');
const router = express.Router();
const { register, login, uploadVerificationDocument,forgotPassword,resetPassword} = require('../controllers/auth');
const { validate, userSchema } = require('../middleware/validation');
const auth = require('../middleware/auth');
const { forgotPasswordSchema, resetPasswordSchema } = require('../middleware/validation');
router.post('/register', validate(userSchema), register);
router.post('/login', login);
router.post('/verify-document', auth(['worker']), uploadVerificationDocument);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
module.exports = router;