const express = require('express');
const router = express.Router();
const { 
  validateCredentials, 
  verifyOtp, 
  checkAuth, 
  logout 
} = require('../controllers/authController');

router.post('/validate-credentials', validateCredentials);
router.post('/verify-otp', verifyOtp);
router.get('/check-auth', checkAuth);
router.post('/logout', logout);

module.exports = router;
