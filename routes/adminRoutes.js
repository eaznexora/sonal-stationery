const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');
const { getDashboardStats } = require('../controllers/dashboardController');
const adminAuth = require('../middleware/adminAuth');

router.route('/stats')
  .get(getAdminStats); // Legacy support if needed

router.route('/dashboard/stats')
  .get(adminAuth, getDashboardStats);

module.exports = router;
