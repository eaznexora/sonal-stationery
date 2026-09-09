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

        // Styles CSS
        content = content.replace(/styles\.css(\?v=[0-9.]+)?/g, 'styles.css?v=3.2');
        
        // Customer Auth CSS
        content = content.replace(/\/css\/customer-auth\.css(\?v=[0-9.]+)?/g, '/css/customer-auth.css?v=3.2');
        content = content.replace(/css\/customer-auth\.css(\?v=[0-9.]+)?/g, 'css/customer-auth.css?v=3.2');
        
        // Storefront JS
        content = content.replace(/storefront\.js(\?v=[0-9.]+)?/g, 'storefront.js?v=3.2');
        
        // Customer Auth JS
        content = content.replace(/\/js\/customer-auth\.js(\?v=[0-9.]+)?/g, '/js/customer-auth.js?v=3.2');
        content = content.replace(/js\/customer-auth\.js(\?v=[0-9.]+)?/g, 'js/customer-auth.js?v=3.2');

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated cache busting in ${file}`);
    }
});
