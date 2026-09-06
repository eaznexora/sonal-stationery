const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { adminAuth } = require('../middleware/adminAuth');

// Allow if user has either categories or products_add (or is superadmin)
const canModifyCategory = (req, res, next) => {
  if (req.admin.role === 'superadmin') return next();
  const perms = req.admin.permissions || [];
  if (perms.includes('categories') || perms.includes('products_add')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Requires Categories or Add Product permission' });
};

// Multer config (reusing logic from products)
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.route('/')
  .get(getCategories) // Public GET for frontend and dropdowns
  .post(adminAuth, canModifyCategory, upload.array('images', 1), createCategory);

router.route('/:id')
  .put(adminAuth, canModifyCategory, upload.array('images', 1), updateCategory)
  .delete(adminAuth, canModifyCategory, deleteCategory);

module.exports = router;
