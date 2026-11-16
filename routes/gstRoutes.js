const express = require('express');
const router = express.Router();
const cors = require('cors');
const gstController = require('../controllers/gstController');

// In-Memory IP Rate Limiter (30 requests / minute)
const rateLimitMap = new Map();

function gstRateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30;

  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many GST lookup requests. Rate limit is 30 requests per minute.'
    });
  }

  return next();
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now - record.startTime > 60000) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

// Enable CORS and apply rate limiting
router.use(cors());
router.get('/:gstin', gstRateLimiter, gstController.lookupGstin);

module.exports = router;

