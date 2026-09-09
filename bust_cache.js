const fs = require('fs');
const path = require('path');

const files = [
    'index.html',
    'cart.html',
    'product.html',
    'profile.html',
    'categories.html',
    'category-products.html'
];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Replace any existing versions with v=3.3
        content = content.replace(/styles\.css(\?v=[0-9.]+)?/g, 'styles.css?v=3.3');
        content = content.replace(/\/css\/customer-auth\.css(\?v=[0-9.]+)?/g, '/css/customer-auth.css?v=3.3');
        content = content.replace(/css\/customer-auth\.css(\?v=[0-9.]+)?/g, 'css/customer-auth.css?v=3.3');
        content = content.replace(/storefront\.js(\?v=[0-9.]+)?/g, 'storefront.js?v=3.3');
        content = content.replace(/\/js\/customer-auth\.js(\?v=[0-9.]+)?/g, '/js/customer-auth.js?v=3.3');
        content = content.replace(/js\/customer-auth\.js(\?v=[0-9.]+)?/g, 'js/customer-auth.js?v=3.3');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated cache busting to v=3.3 in ${file}`);
    }
});
