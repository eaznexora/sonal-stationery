const Category = require('../models/Category');

// @desc    Fetch all active categories
// @route   GET /api/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const query = req.query.all ? {} : { status: 'active' };
    const categories = await Category.find(query).sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private/Admin
exports.createCategory = async (req, res) => {
  try {
    const categoryData = { ...req.body };
    
    // Auto-generate slug
    if (categoryData.name) {
      categoryData.slug = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    if (typeof categoryData.subCategories === 'string') {
      try {
        categoryData.subCategories = JSON.parse(categoryData.subCategories);
      } catch(e) {
        categoryData.subCategories = categoryData.subCategories.split(',').map(i => i.trim()).filter(i => i);
      }
    }

    if (req.files && req.files.length > 0) {
      categoryData.image = `/uploads/${req.files[0].filename}`;
    }

    const category = new Category(categoryData);
    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/Admin
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      Object.assign(category, req.body);
      
      if (req.body.name && !req.body.slug) {
        category.slug = req.body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      }

      if (typeof req.body.subCategories === 'string') {
        try {
          category.subCategories = JSON.parse(req.body.subCategories);
        } catch(e) {
          category.subCategories = req.body.subCategories.split(',').map(i => i.trim()).filter(i => i);
        }
      }

      if (req.files && req.files.length > 0) {
        category.image = `/uploads/${req.files[0].filename}`;
      }

      const updatedCategory = await category.save();
      res.json(updatedCategory);
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (category) {
      await Category.findByIdAndDelete(req.params.id);
      res.json({ message: 'Category removed' });
    } else {
      res.status(404).json({ message: 'Category not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
