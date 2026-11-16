const express = require('express');
const router = express.Router();
const adminStoreRewardsController = require('../controllers/adminStoreRewardsController');
const { adminAuth } = require('../middleware/adminAuth');

// All admin store rewards endpoints require valid admin token
router.use(adminAuth);

// Leaderboard & Customer Management
router.get('/leaderboard', adminStoreRewardsController.getLeaderboard);
router.post('/customer/:id/purchase', adminStoreRewardsController.addPurchase);

// WhatsApp Templates Management
router.get('/templates', adminStoreRewardsController.getTemplates);
router.post('/templates', adminStoreRewardsController.createTemplate);
router.put('/templates/:id', adminStoreRewardsController.updateTemplate);
router.delete('/templates/:id', adminStoreRewardsController.deleteTemplate);

// Live Message Render & wa.me URL Generator
router.post('/render-message', adminStoreRewardsController.renderMessage);

// Pro Tips Management
router.get('/pro-tips', adminStoreRewardsController.getProTips);
router.post('/pro-tips', adminStoreRewardsController.createProTip);
router.put('/pro-tips/:id', adminStoreRewardsController.updateProTip);
router.delete('/pro-tips/:id', adminStoreRewardsController.deleteProTip);

module.exports = router;

