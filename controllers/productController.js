const Product = require('../models/Product');

// @desc    Fetch all products (with filters, sort, pagination)
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { search, category, stockStatus, sort, page = 1, limit = 10 } = req.query;
    const query = {};

    // Search query
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // Stock status filter
    if (stockStatus === 'inStock') {
      query.stock = { $gt: 0 };
    } else if (stockStatus === 'outOfStock') {
      query.stock = { $lte: 0 };
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default sort
    if (sort === 'priceAsc') sortOption = { price: 1 };
    if (sort === 'priceDesc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.json({
      products,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product by ID or slug
// @route   GET /api/products/:idOrSlug
// @access  Public
exports.getProductById = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let product;

    // Check if valid ObjectId
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(idOrSlug);
    } else {
      product = await Product.findOne({ slug: idOrSlug });
    }

    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // Auto-generate slug if not provided
    if (!productData.slug && productData.name) {
      productData.slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    // Normalize 'published' to 'active'
    if (productData.status === 'published') {
      productData.status = 'active';
    }

    // Parse array/object fields that come as JSON strings from FormData
    ['features', 'keyFeatures', 'faqs', 'tags', 'colors', 'variants', 'dimensions'].forEach(field => {
      if (typeof productData[field] === 'string') {
        try {
          productData[field] = JSON.parse(productData[field]);
        } catch (e) {
          // If it's not valid JSON, maybe it's comma separated (for tags/features/variants)
          if (field === 'tags' || field === 'features' || field === 'keyFeatures' || field === 'variants') {
             productData[field] = productData[field].split(',').map(i => i.trim()).filter(i => i);
          }
        }
      }
    });

    if (productData.isGiftWrapAvailable !== undefined) {
      productData.isGiftWrapAvailable = productData.isGiftWrapAvailable === 'true' || productData.isGiftWrapAvailable === true;
    }

    // Parse numeric fields to avoid NaN issues
    ['price', 'discountPrice', 'stock'].forEach(field => {
      if (productData[field] !== undefined && productData[field] !== '') {
        const num = Number(productData[field]);
        productData[field] = isNaN(num) ? 0 : num;
      } else if (field === 'price' || field === 'stock') {
        productData[field] = 0; // enforce defaults for required numeric fields
      }
    });
    
    // Handle image uploads via multer or use fallback
    if (req.files && req.files.length > 0) {
      productData.images = req.files.map(file => `/uploads/${file.filename}`);
    } else {
      productData.images = ['/logo.png'];
    }

    const product = new Product(productData);
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a product / quick stock adjust
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const updateData = { ...req.body };
      
      // Normalize 'published' to 'active'
      if (updateData.status === 'published') {
        updateData.status = 'active';
      }

      // Parse numeric fields to avoid NaN issues
      ['price', 'discountPrice', 'stock'].forEach(field => {
        if (updateData[field] !== undefined && updateData[field] !== '') {
          const num = Number(updateData[field]);
          updateData[field] = isNaN(num) ? 0 : num;
        } else if (updateData[field] === '') {
          if (field === 'price' || field === 'stock') updateData[field] = 0;
        }
      });

      // Parse array/object fields that come as JSON strings from FormData
      ['features', 'keyFeatures', 'faqs', 'tags', 'colors', 'variants', 'dimensions'].forEach(field => {
        if (typeof updateData[field] === 'string') {
          try {
            updateData[field] = JSON.parse(updateData[field]);
          } catch (e) {
            if (field === 'tags' || field === 'features' || field === 'keyFeatures' || field === 'variants') {
               updateData[field] = updateData[field].split(',').map(i => i.trim()).filter(i => i);
            }
          }
        }
      });

      if (updateData.isGiftWrapAvailable !== undefined) {
        updateData.isGiftWrapAvailable = updateData.isGiftWrapAvailable === 'true' || updateData.isGiftWrapAvailable === true;
      }

      // Handle existingImages explicitly passed from frontend edit flow
      if (updateData.existingImages) {
        try {
          const parsedExisting = JSON.parse(updateData.existingImages);
          product.images = Array.isArray(parsedExisting) ? parsedExisting : [];
        } catch(e) {
          if(typeof updateData.existingImages === 'string') product.images = [updateData.existingImages];
        }
      }

      // Update fields
      Object.assign(product, updateData);
      
      // Handle new image uploads if any (append to remaining existing images)
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => `/uploads/${file.filename}`);
        product.images = [...product.images, ...newImages];
      }

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
