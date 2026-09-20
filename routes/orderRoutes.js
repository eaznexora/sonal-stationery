const express = require('express');
const router = express.Router();
const {
  getOrders,
  createOrder,
  updateOrderStatus,
  getMyOrders
} = require('../controllers/orderController');

router.route('/my-orders')
  .get(getMyOrders);

router.route('/')
  .get(getOrders)
  .post(createOrder);

router.route('/:id/status')
  .put(updateOrderStatus);

module.exports = router;
