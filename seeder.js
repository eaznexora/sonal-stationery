require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Category = require('./models/Category');
const Product = require('./models/Product');

// Sample Stationery Categories
const categories = [
  { name: 'Pens & Pencils', slug: 'pens-pencils', status: 'active' },
  { name: 'Notebooks & Diaries', slug: 'notebooks-diaries', status: 'active' },
  { name: 'Art Supplies', slug: 'art-supplies', status: 'active' },
  { name: 'Gifts & Wrapping', slug: 'gifts-wrapping', status: 'active' }
];

// Sample Stationery Products
const products = [
  {
    name: 'Premium Gel Pen - Black',
    slug: 'premium-gel-pen-black',
    sku: 'PEN-GEL-BLK-001',
    description: 'Smooth writing premium gel pen with waterproof ink.',
    price: 50,
    discountPrice: 45,
    category: 'Pens & Pencils',
    stock: 150,
    status: 'active',
    isFeatured: true
  },
  {
    name: 'A4 Spiral Notebook',
    slug: 'a4-spiral-notebook',
    sku: 'NOTE-SPIRAL-A4-001',
    description: 'High-quality A4 spiral bound notebook with 200 ruled pages.',
    price: 150,
    category: 'Notebooks & Diaries',
    stock: 80,
    status: 'active'
  },
  {
    name: 'Professional Watercolor Set (24 Colors)',
    slug: 'professional-watercolor-set-24',
    sku: 'ART-WC-24-001',
    description: 'Vibrant 24 color professional watercolor pan set with brush.',
    price: 850,
    category: 'Art Supplies',
    stock: 25,
    status: 'active',
    isFeatured: true
  },
  {
    name: 'Festive Gift Wrap Roll (5 Meters)',
    slug: 'festive-gift-wrap-roll-5m',
    sku: 'GIFT-WRAP-5M-001',
    description: 'Beautiful 5-meter festive design gift wrap roll.',
    price: 120,
    category: 'Gifts & Wrapping',
    stock: 200,
    status: 'active'
  }
];

const seedData = async () => {
  try {
    await connectDB();

    console.log('Wiping existing Category and Product collections...');
    await Category.deleteMany();
    await Product.deleteMany();

    console.log('Seeding new Stationery Categories...');
    await Category.insertMany(categories);

    console.log('Seeding new Stationery Products...');
    await Product.insertMany(products);

    console.log('Data Imported Successfully!');
    process.exit();
  } catch (error) {
    console.error(`Error with data import: ${error}`);
    process.exit(1);
  }
};

seedData();
