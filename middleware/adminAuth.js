const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  try {
    const token = req.cookies.admin_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded; // { email, role, permissions }
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized. Invalid token.' });
  }
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    if (req.admin.role === 'superadmin') {
      return next(); // Superadmin bypasses all permission checks
    }

    if (req.admin.permissions && req.admin.permissions.includes(permission)) {
      return next(); // Employee has the required permission
    }

    return res.status(403).json({ success: false, message: 'Forbidden. Insufficient permissions.' });
  };
};

module.exports = { adminAuth, requirePermission };
