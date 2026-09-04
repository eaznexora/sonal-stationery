const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { getInventoryStats, getInventory, updateStock } = require('../controllers/inventoryController');
const adminAuth = require('../middleware/adminAuth');

router.route('/stats')
  .get(getAdminStats); // Legacy support if needed

router.route('/dashboard/stats')
  .get(adminAuth, getDashboardStats);

router.route('/inventory/stats')
  .get(adminAuth, getInventoryStats);

router.route('/inventory')
  .get(adminAuth, getInventory);

router.route('/inventory/:id/stock')
  .patch(adminAuth, updateStock);

module.exports = router;
