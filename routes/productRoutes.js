const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { adminAuth } = require('../middleware/adminAuth');

// Allow if user has either products or products_add (or is superadmin)
const canAddProduct = (req, res, next) => {
  if (req.admin.role === 'superadmin') return next();
  const perms = req.admin.permissions || [];
  if (perms.includes('products_add') || perms.includes('products')) {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied: Requires Add Product permission' });
};

// Multer config
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb('Images only!');
    }
  },
});

router.route('/')
  .get(getProducts) // Public
  .post(adminAuth, canAddProduct, upload.array('images', 8), createProduct);

router.route('/:idOrSlug')
  .get(getProductById);

router.route('/:id')
  .put(adminAuth, canAddProduct, upload.array('images', 8), updateProduct)
  .delete(adminAuth, canAddProduct, deleteProduct);

module.exports = router;
