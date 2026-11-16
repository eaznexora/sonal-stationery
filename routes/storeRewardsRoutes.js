const express = require('express');
const router = express.Router();
const storeRewardsController = require('../controllers/storeRewardsController');

// Public customer onboarding & verification endpoints
router.post('/send-otp', storeRewardsController.sendOtp);
router.post('/verify-otp', storeRewardsController.verifyOtp);
router.get('/my-rank', storeRewardsController.getMyRank);
router.get('/pro-tips', storeRewardsController.getPublicProTips);

module.exports = router;

