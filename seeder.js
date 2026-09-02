require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Category = require('./models/Category');
const Product = require('./models/Product');

// Sample Stationery Categories (4 core categories)
const categories = [
  { name: 'Pens & Pencils', slug: 'pens-pencils', status: 'active' },
  { name: 'Notebooks & Diaries', slug: 'notebooks-diaries', status: 'active' },
  { name: 'Art Supplies', slug: 'art-supplies', status: 'active' },
  { name: 'Gifts & Wrapping', slug: 'gifts-wrapping', status: 'active' }
];

// Sample Stationery Products (12 total)
const products = [
  // Pens
  {
    name: 'Premium Gel Pen - Black',
    slug: 'premium-gel-pen-black',
    sku: 'PEN-GEL-BLK-001',
    description: 'Smooth writing premium gel pen.',
    price: 50,
    category: 'Pens & Pencils',
    stock: 150,
    status: 'active',
    isFeatured: true
  },
  {
    name: 'Fountain Pen Classic',
    slug: 'fountain-pen-classic',
    sku: 'PEN-FOUNTAIN-001',
    description: 'Classic ink fountain pen for smooth writing.',
    price: 350,
    category: 'Pens & Pencils',
    stock: 50,
    status: 'active'
  },
  {
    name: 'Pack of 10 HB Pencils',
    slug: 'pack-of-10-hb-pencils',
    sku: 'PENCIL-HB-10',
    description: 'High quality HB pencils for drawing and writing.',
    price: 80,
    category: 'Pens & Pencils',
    stock: 200,
    status: 'active'
  },
  {
    name: 'Multi-Color Pen Pack',
    slug: 'multi-color-pen-pack',
    sku: 'PEN-MULTI-04',
    description: 'Pack of 4 vibrant color pens for notes.',
    price: 120,
    category: 'Pens & Pencils',
    stock: 100,
    status: 'active'
  },
  // Notebooks
  {
    name: 'A4 Spiral Notebook',
    slug: 'a4-spiral-notebook',
    sku: 'NOTE-SPIRAL-A4-001',
    description: 'A4 spiral bound notebook with 200 ruled pages.',
    price: 150,
    category: 'Notebooks & Diaries',
    stock: 80,
    status: 'active',
    isFeatured: true
  },
  {
    name: 'Executive Hardcover Diary',
    slug: 'executive-hardcover-diary',
    sku: 'NOTE-HARD-001',
    description: 'Premium hardcover diary for professionals.',
    price: 450,
    category: 'Notebooks & Diaries',
    stock: 30,
    status: 'active'
  },
  {
    name: 'Pocket Memo Pad',
    slug: 'pocket-memo-pad',
    sku: 'NOTE-MEMO-001',
    description: 'Small 100-page memo pad for quick notes.',
    price: 40,
    category: 'Notebooks & Diaries',
    stock: 120,
    status: 'active'
  },
  {
    name: 'Dot Grid Journal',
    slug: 'dot-grid-journal',
    sku: 'NOTE-DOT-001',
    description: 'Perfect for bullet journaling.',
    price: 250,
    category: 'Notebooks & Diaries',
    stock: 60,
    status: 'active'
  },
  // Art Supplies
  {
    name: 'Professional Watercolor Set (24 Colors)',
    slug: 'professional-watercolor-set-24',
    sku: 'ART-WC-24-001',
    description: 'Vibrant 24 color professional watercolor pan set.',
    price: 850,
    category: 'Art Supplies',
    stock: 25,
    status: 'active',
    isFeatured: true
  },
  {
    name: 'Sketchbook A3',
    slug: 'sketchbook-a3',
    sku: 'ART-SKETCH-A3',
    description: 'Thick paper A3 sketchbook for artists.',
    price: 250,
    category: 'Art Supplies',
    stock: 60,
    status: 'active'
  },
  {
    name: 'Acrylic Paint Set (12 Tubes)',
    slug: 'acrylic-paint-set-12',
    sku: 'ART-ACRYLIC-12',
    description: '12 vibrant acrylic paint tubes.',
    price: 600,
    category: 'Art Supplies',
    stock: 45,
    status: 'active',
    isFeatured: true
  },
  // Gifts & Wrapping
  {
    name: 'Decorative Ribbon Set',
    slug: 'decorative-ribbon-set',
    sku: 'GIFT-RIBBON-SET',
    description: 'Set of 5 metallic ribbons for gift wrapping.',
    price: 180,
    category: 'Gifts & Wrapping',
    stock: 90,
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
