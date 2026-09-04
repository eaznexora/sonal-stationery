const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // Attach admin details to request
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token.' });
  }
};

module.exports = adminAuth;
