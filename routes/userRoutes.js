const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUsers,
  updateUserStatus,
  deleteUser,
} = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/login', loginUser);

router.route('/')
  .get(getUsers);

router.route('/:id/status')
  .put(updateUserStatus);

router.route('/:id')
  .delete(deleteUser);

module.exports = router;
