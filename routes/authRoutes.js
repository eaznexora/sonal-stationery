const express = require('express');
const router = express.Router();
const { 
  loginPassword, 
  sendOtp, 
  verifyOtp, 
  checkAuth, 
  logout 
} = require('../controllers/authController');

router.post('/login-password', loginPassword);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.get('/check-auth', checkAuth);
router.post('/logout', logout);

module.exports = router;
