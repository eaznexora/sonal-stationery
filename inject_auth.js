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

        // Inject script before </body>
        if (!content.includes('<script src="/js/customer-auth.js"></script>')) {
            content = content.replace('</body>', '    <script src="/js/customer-auth.js"></script>\n</body>');
        }

        // Replace profile icon clicks in desktop nav and mobile nav
        // Desktop nav profile
        content = content.replace(
            '<a href="profile.html" class="icon-btn" aria-label="Account"><i data-lucide="user"></i></a>',
            '<a href="#" onclick="event.preventDefault(); window.requireCustomerAuth(() => window.location.href=\'profile.html\', \'Login to access your profile\')" class="icon-btn" aria-label="Account"><i data-lucide="user"></i></a>'
        );

        // Mobile bottom nav profile
        content = content.replace(
            '<a href="profile.html" class="nav-item">\n            <i data-lucide="user"></i>\n            <span>Profile</span>\n        </a>',
            '<a href="#" onclick="event.preventDefault(); window.requireCustomerAuth(() => window.location.href=\'profile.html\', \'Login to access your profile\')" class="nav-item">\n            <i data-lucide="user"></i>\n            <span>Profile</span>\n        </a>'
        );

        // Mobile bottom nav orders
        content = content.replace(
            '<a href="profile.html#tab-orders" class="nav-item">',
            '<a href="#" onclick="event.preventDefault(); window.requireCustomerAuth(() => window.location.href=\'profile.html#tab-orders\', \'Login to view your orders\')" class="nav-item">'
        );

        // Cart page Proceed to Checkout
        if (file === 'cart.html') {
            content = content.replace(
                '<button class="btn-checkout" style="width: 100%; margin-top: 2rem;">Proceed to Checkout</button>',
                '<button class="btn-checkout" style="width: 100%; margin-top: 2rem;" onclick="window.requireCustomerAuth(() => alert(\'Redirecting to checkout...\'), \'Login to complete your checkout\')">Proceed to Checkout</button>'
            );
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${file}`);
    } else {
        console.log(`File not found: ${file}`);
    }
});
