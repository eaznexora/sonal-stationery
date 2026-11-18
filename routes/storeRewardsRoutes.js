const express = require('express');
const router = express.Router();
const storeRewardsController = require('../controllers/storeRewardsController');

// Public customer onboarding & verification endpoints
router.get('/google-config', storeRewardsController.getGoogleConfig);
router.post('/google-auth', storeRewardsController.googleAuth);
router.post('/send-otp', storeRewardsController.sendOtp);
router.post('/verify-otp', storeRewardsController.verifyOtp);
router.get('/my-rank', storeRewardsController.getMyRank);
router.get('/pro-tips', storeRewardsController.getPublicProTips);
router.post('/checkin', storeRewardsController.recordCheckin);

module.exports = router;

