require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

// Route imports
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Connect Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);

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
