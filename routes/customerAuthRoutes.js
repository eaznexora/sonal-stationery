const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');

router.post('/send-otp', customerAuthController.sendOtp);
router.post('/verify-otp', customerAuthController.verifyOtp);
router.post('/google', customerAuthController.googleLogin);
router.get('/me', customerAuthController.getMe);
router.post('/logout', customerAuthController.logout);

module.exports = router;
