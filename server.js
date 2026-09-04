require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');

// Route imports
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Mount routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);

// Admin static route protection
app.use('/admin', (req, res, next) => {
  if (req.path === '/login.html' || req.path === '/login' || req.path.startsWith('/js/') || req.path.startsWith('/css/')) {
    return next();
  }
  const token = req.cookies?.admin_token;
  if (!token) {
    return res.redirect('/admin/login.html');
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.redirect('/admin/login.html');
  }
});

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve all root files statically so frontend can be accessed via port 5005
app.use(express.static(path.join(__dirname, '.')));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

// Start Server
const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
