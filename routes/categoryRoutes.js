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
  .get(getCategories)
  .post(upload.array('images', 1), createCategory);

router.route('/:id')
  .put(upload.array('images', 1), updateCategory)
  .delete(deleteCategory);

module.exports = router;
