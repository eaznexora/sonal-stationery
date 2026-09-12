const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const userController = require('../controllers/userController');

router.use(adminAuth); // Enforce admin-only access across all user routes

router.get('/', userController.getUsers);
router.patch('/:id/block', userController.toggleBlockStatus);
router.delete('/:id', userController.deleteUser);

module.exports = router;
