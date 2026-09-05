const ActivityLog = require('../models/ActivityLog');

/**
 * Logs an activity to the database without blocking the main request thread.
 * 
 * @param {Object} params
 * @param {Object} params.req - Express request object (to extract user, role, ip)
 * @param {String} params.action - Action name (e.g. 'CREATE_PRODUCT')
 * @param {String} params.target - Target identifier (e.g. 'Product: Classmate Notebook')
 * @param {Mixed} params.details - Optional details or diff
 */
exports.logActivity = async ({ req, action, target, details }) => {
  try {
    // If no req provided, or no user (e.g., login failure before setting req.admin), use defaults
    let user = 'system';
    let role = 'system';
    let ip = req && req.ip ? req.ip : 'unknown';

    if (req && req.admin) {
      user = req.admin.email || 'system';
      role = req.admin.role || 'employee';
    } else if (req && req.body && req.body.email) {
      // Fallback for login activities where req.admin isn't populated yet
      user = req.body.email;
      role = 'user'; // Or look it up, but 'user' is fine for pre-auth actions
    }

    const logEntry = new ActivityLog({
      user,
      role,
      action,
      target,
      details,
      ip
    });

    // We don't await this so it runs truly non-blocking in the background, 
    // but Mongoose handles connection pooling.
    // To catch errors we handle the promise explicitly.
    logEntry.save().catch(err => {
      console.error('[AuditLogger] Background save failed:', err);
    });
    
  } catch (err) {
    // Failsafe catch block so it never crashes the main thread
    console.error('[AuditLogger] Failsafe error:', err);
  }
};
