const express = require('express');
const router = express.Router();
const { getAdminStats } = require('../controllers/adminController');

router.route('/stats')
  .get(getAdminStats);

module.exports = router;
