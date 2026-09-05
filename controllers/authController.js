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

const bcrypt = require('bcryptjs');

// POST /api/admin/validate-credentials
exports.validateCredentials = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const lowerEmail = email.toLowerCase();
    
    // 1. Validate credentials
    const isSuperAdmin = (
      lowerEmail === process.env.ADMIN_EMAIL.trim().toLowerCase() &&
      password === process.env.ADMIN_PASSWORD.trim()
    );
    
    let isEmployee = false;
    if (!isSuperAdmin) {
      const employee = await AdminUser.findOne({ email: lowerEmail, isActive: true });
      if (employee && employee.password) {
        isEmployee = await bcrypt.compare(password, employee.password);
      }
    }

    if (!isSuperAdmin && !isEmployee) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 2. Generate and store OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    otpStorage.set(lowerEmail, { otp, expiresAt });

    // Fallback logging for testing/development
    console.log(`[AUTH DEBUG] Generated OTP for ${lowerEmail}:${otp}`);

    // 3. Send email via Resend
    const fromAddress = process.env.RESEND_FROM || 'Sonal Stationery <noreply@sonalstationary.in>';
    
    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: email, // use requested casing for the email address
        subject: `Your Sonal Stationery Admin OTP: ${otp}`,
        html: `<div style="font-family:sans-serif;padding:20px;">
                 <h2>Your Admin Login OTP</h2>
                 <p>Your one-time password is <strong>${otp}</strong>. It expires in 10 minutes. Do not share this code.</p>
               </div>`
      });

      if (error) {
        console.error("Resend API Error:", error);
        // We log the error but still return success so the user can enter the fallback OTP from logs if testing.
      }
    } catch (sendError) {
      console.error("Resend Try/Catch Error:", sendError);
    }

    res.json({ success: true, message: 'Credentials validated, OTP sent' });
  } catch (error) {
    console.error('Validate credentials error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
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
