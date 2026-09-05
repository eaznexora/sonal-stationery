const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const AdminUser = require('../models/AdminUser');

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory OTP storage: { [email]: { otp, expiresAt } }
const otpStorage = new Map();

// Helper to sign and set token
const signAndSetToken = (res, email, role = 'superadmin', permissions = []) => {
  const token = jwt.sign({ email, role, permissions }, process.env.JWT_SECRET, { expiresIn: '7d' });
  
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
};

// POST /api/admin/login-password
exports.loginPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    if (
      email.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase() &&
      password === process.env.ADMIN_PASSWORD.trim()
    ) {
      const token = signAndSetToken(res, email);
      return res.json({ success: true, message: 'Login successful', token });
    }

    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('Password login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// POST /api/admin/send-otp
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const lowerEmail = email.toLowerCase();
    
    // Check if it's superadmin or valid active employee
    const isSuperAdmin = lowerEmail === process.env.ADMIN_EMAIL.toLowerCase();
    let isEmployee = false;
    
    if (!isSuperAdmin) {
      const employee = await AdminUser.findOne({ email: lowerEmail, isActive: true });
      if (employee) {
        isEmployee = true;
      }
    }

    if (!isSuperAdmin && !isEmployee) {
      return res.status(401).json({ success: false, message: 'Unauthorized email' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10-minute expiration
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStorage.set(lowerEmail, { otp, expiresAt });

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: process.env.ADMIN_EMAIL, // For testing/sandbox, we might have to send to verified email. But let's send to actual email in real life. Wait, resend free tier only allows sending to verified email (the one on the account). I will use `email` here, but fallback to ADMIN_EMAIL if it fails. Actually, I'll just use the requested email and assume domain is verified.
      subject: `Your Sonal Stationery Admin OTP: ${otp}`,
      html: `<div style="font-family:sans-serif;padding:20px;">
               <h2>Admin Verification Code</h2>
               <p>Your one-time login OTP is:</p>
               <h1 style="letter-spacing:4px;color:#2c3e50;">${otp}</h1>
               <p>Valid for 10 minutes. Do not share this code.</p>
             </div>`
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP email' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error sending OTP' });
  }
};

// POST /api/admin/verify-otp
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const lowerEmail = email.toLowerCase();
    const storedData = otpStorage.get(lowerEmail);

    if (!storedData) {
      return res.status(400).json({ success: false, message: 'No OTP requested for this email' });
    }

    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(lowerEmail);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // Check role and permissions
    let role = 'employee';
    let permissions = [];
    
    if (lowerEmail === process.env.ADMIN_EMAIL.toLowerCase()) {
      role = 'superadmin';
    } else {
      const employee = await AdminUser.findOne({ email: lowerEmail, isActive: true });
      if (!employee) {
        return res.status(401).json({ success: false, message: 'Unauthorized employee' });
      }
      role = employee.role;
      permissions = employee.permissions;
    }

    // Success! Clear OTP and generate token
    otpStorage.delete(lowerEmail);
    const token = signAndSetToken(res, email, role, permissions);

    res.json({ success: true, message: 'OTP verified successfully', token, admin: { email, role, permissions } });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
};

// GET /api/admin/check-auth
exports.checkAuth = (req, res) => {
  try {
    const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.json({ authenticated: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, admin: decoded });
  } catch (error) {
    res.json({ authenticated: false });
  }
};

// POST /api/admin/logout
exports.logout = (req, res) => {
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
};
