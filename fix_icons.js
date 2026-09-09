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
        let newContent = content.replace(/data-lucide="twitter"/g, 'data-lucide="twitter"');
        // Actually, user said (twitter -> x). Let's replace with x.
        newContent = newContent.replace(/data-lucide="twitter"/g, 'data-lucide="twitter"');
        // Wait, replacing 'twitter' with 'x'
        newContent = content.replace(/data-lucide="twitter"/g, 'data-lucide="x"');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated ${file}`);
    }
});
