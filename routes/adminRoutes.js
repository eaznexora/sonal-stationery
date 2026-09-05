const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');
const { getDashboardStats } = require('../controllers/dashboardController');
const { getInventoryStats, getInventory, updateStock } = require('../controllers/inventoryController');
const { getAnalytics } = require('../controllers/analyticsController');
const { getTeam, addEmployee, updateEmployee, removeEmployee } = require('../controllers/settingsController');
const { getActivityLogs } = require('../controllers/activityController');
const { adminAuth, requirePermission } = require('../middleware/adminAuth');

router.route('/stats')
  .get(adminAuth, getAdminStats); // Legacy support if needed

router.route('/dashboard/stats')
  .get(adminAuth, requirePermission('dashboard'), getDashboardStats);

router.route('/inventory/stats')
  .get(adminAuth, requirePermission('inventory'), getInventoryStats);

router.route('/inventory')
  .get(adminAuth, requirePermission('inventory'), getInventory);

router.route('/inventory/:id/stock')
  .patch(adminAuth, requirePermission('inventory'), updateStock);

router.route('/analytics')
  .get(adminAuth, requirePermission('analytics'), getAnalytics);

router.route('/activity')
  .get(adminAuth, requirePermission('activity'), getActivityLogs);

// Settings & Team
router.route('/settings/team')
  .get(adminAuth, requirePermission('settings'), getTeam)
  .post(adminAuth, requirePermission('settings'), addEmployee);

router.route('/settings/team/:id')
  .patch(adminAuth, requirePermission('settings'), updateEmployee)
  .delete(adminAuth, requirePermission('settings'), removeEmployee);

module.exports = router;
