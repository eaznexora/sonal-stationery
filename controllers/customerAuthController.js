const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const { OAuth2Client } = require('google-auth-library');

const resend = new Resend(process.env.RESEND_API_KEY);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({ email: normalizedEmail, name: '', role: 'customer' });
    }
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    console.log('[CUSTOMER OTP DEBUG] %s -> %s', normalizedEmail, otp);

    const { data, error } = await resend.emails.send({
      from: 'Sonal Stationery <noreply@sonalstationary.in>',
      to: normalizedEmail,
      subject: `Your Sonal Stationery Verification Code: ${otp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #FBF9F5; color: #333; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #4A5D23;">Verification Code</h2>
          <p>Hello,</p>
          <p>Your verification code for Sonal Stationery is:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px; color: #333; background-color: #fff; padding: 10px 20px; border-radius: 4px; display: inline-block; border: 1px solid #ccc;">${otp}</h1>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend Error:', error);
      return res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.cookie('customer_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ success: false, message: 'Google credential required' });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) return res.status(400).json({ success: false, message: 'Invalid Google payload' });

    const normalizedEmail = payload.email.toLowerCase().trim();
    
    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      user = new User({
        email: normalizedEmail,
        name: payload.name || '',
        picture: payload.picture || '',
        googleId: payload.sub,
        role: 'customer'
      });
    } else {
      user.googleId = payload.sub;
      user.name = user.name || payload.name || '';
      user.picture = user.picture || payload.picture || '';
    }
    
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.cookie('customer_token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google Login Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const token = req.cookies.customer_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    
    if (!token) {
      return res.json({ success: false, authenticated: false });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -otp -otpExpires');

    if (!user || user.role !== 'customer') {
      return res.json({ success: false, authenticated: false });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    res.json({ success: true, authenticated: true, user });
  } catch (error) {
    res.json({ success: false, authenticated: false });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('customer_token', { path: '/' });
  res.json({ success: true });
};

exports.updateProfile = async (req, res) => {
  try {
    const token = req.cookies.customer_token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { name, phone } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const user = await User.findByIdAndUpdate(
      decoded.id, 
      { name, phone },
      { new: true }
    ).select('-password -otp -otpExpires');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
