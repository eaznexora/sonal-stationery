// storefront.js
const API_BASE = window.location.port === '5000' ? '' : 'http://localhost:5000';

// Fetch and render Categories for Homepage
async function renderHomepageCategories() {
    const catGrid = document.querySelector('.category-grid');
    if (!catGrid) return;
    
    try {
        catGrid.innerHTML = '<p>Loading categories...</p>';
        const res = await fetch(`${API_BASE}/api/categories?status=active`);
        const data = await res.json();
        const categories = Array.isArray(data) ? data : (data.categories || data.data || []);
        console.log('Fetched homepage categories:', categories);
        
        if (!categories || categories.length === 0) {
            catGrid.innerHTML = '<p>No categories found.</p>';
            return;
        }

        catGrid.innerHTML = categories.slice(0, 3).map(cat => {
            const img = cat.image || '/logo.png';
            return `
            <a href="category-products.html?cat=${encodeURIComponent(cat.name)}" class="category-card">
                <img src="${img}" alt="${cat.name}" onerror="this.src='/logo.png'">
                <div class="category-overlay">
                    <h3>${cat.name}</h3>
                </div>
            </a>
        `}).join('');
    } catch (e) {
        catGrid.innerHTML = '<p>Error loading categories.</p>';
        console.error(e);
    }
}

// Fetch and render Featured Products for Homepage
async function renderFeaturedProducts() {
    const prodGrid = document.querySelector('.product-grid');
    // Only run on homepage if prodGrid exists and we are not on category page
    if (!prodGrid || window.location.pathname.includes('category-products')) return;
    
    try {
        prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading products...</p>';
        // Assuming your API can filter by featured or just fetch active products
        const res = await fetch(`${API_BASE}/api/products?status=active`);
        const data = await res.json();
        const productList = Array.isArray(data) ? data : (data.products || data.data || data.items || []);
        
        // Try filtering for featured if such field exists, else take top 6
        const featured = productList.filter(p => p.isFeatured);
        let products = featured.length >= 4 ? featured : productList;
        
        products = products.slice(0, 6);

        if (products.length === 0) {
            prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No products available.</p>';
            return;
        }

        prodGrid.innerHTML = products.map(p => {
            const img = (p.images && p.images.length > 0) ? (p.images[0].startsWith('http') ? p.images[0] : `${API_BASE}${p.images[0]}`) : '/logo.png';
            return `
            <article class="product-card" onclick="window.location.href='product.html?id=${p._id}';" style="cursor: pointer;">
                <div class="img-wrapper">
                    <img src="${img}" alt="${p.name}">
                    <div class="product-hover">
                        <button class="btn-quick-add" data-id="${p._id}" data-title="${p.name}" data-price="${p.price}" data-image="${img}" data-variant="Default">Quick Add</button>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">₹${p.price.toFixed(2)}</p>
                </div>
            </article>
        `}).join('');
    } catch (e) {
        prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error loading products.</p>';
        console.error(e);
    }
}

// Fetch and render Products for Category Page
async function renderCategoryProducts() {
    const prodGrid = document.querySelector('.plp-main .product-grid');
    if (!prodGrid) return;
    
    try {
        prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading products...</p>';
        
        const urlParams = new URLSearchParams(window.location.search);
        const cat = urlParams.get('cat');
        
        let url = `${API_BASE}/api/products?status=active`;
        if (cat) {
            url += `&category=${encodeURIComponent(cat)}`;
            document.getElementById('dynamicBreadcrumb').textContent = cat;
            document.getElementById('dynamicTitle').textContent = cat;
        }

        const res = await fetch(url);
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products || data.data || data.items || []);
        
        document.getElementById('dynamicCount').textContent = `Showing ${products.length} Products`;

        if (products.length === 0) {
            prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No products found in this category.</p>';
            return;
        }

        prodGrid.innerHTML = products.map(p => {
            const img = (p.images && p.images.length > 0) ? (p.images[0].startsWith('http') ? p.images[0] : `${API_BASE}${p.images[0]}`) : '/logo.png';
            return `
            <article class="product-card" onclick="window.location.href='product.html?id=${p._id}';" style="cursor: pointer;">
                <div class="img-wrapper">
                    <img src="${img}" alt="${p.name}">
                    <div class="product-hover">
                        <button class="btn-quick-add" data-id="${p._id}" data-title="${p.name}" data-price="${p.price}" data-image="${img}" data-variant="Default">Quick Add</button>
                    </div>
                </div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">₹${p.price.toFixed(2)}</p>
                </div>
            </article>
        `}).join('');
    } catch (e) {
        prodGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Error loading products.</p>';
        console.error(e);
    }
}

// Render dynamic mega menu if present
async function renderMegaMenu() {
    const megaMenu = document.querySelector('.mega-menu');
    if (!megaMenu) return;
    try {
        const res = await fetch(`${API_BASE}/api/categories?status=active`);
        const data = await res.json();
        const categories = Array.isArray(data) ? data : (data.categories || data.data || []);
        console.log('Fetched mega menu categories:', categories);
        
        megaMenu.innerHTML = categories.slice(0, 3).map(cat => `
            <div class="mega-column">
                <h4>${cat.name}</h4>
                ${(cat.subCategories || []).map(sub => `<a href="category-products.html?cat=${encodeURIComponent(cat.name)}&sub=${encodeURIComponent(sub)}">${sub}</a>`).join('')}
                <a href="category-products.html?cat=${encodeURIComponent(cat.name)}">View All ${cat.name}</a>
            </div>
        `).join('');
    } catch(e) {
        console.error(e);
    }
}

// Render categories for the categories.html landing page
async function renderCategoryLanding() {
    const landingGrid = document.getElementById('categoryGrid');
    if (!landingGrid) return;
    
    try {
        landingGrid.innerHTML = '<p>Loading categories...</p>';
        const res = await fetch(`${API_BASE}/api/categories?status=active`);
        const data = await res.json();
        const categories = Array.isArray(data) ? data : (data.categories || data.data || []);
        
        if (categories.length === 0) {
            landingGrid.innerHTML = '<p>No categories found.</p>';
            return;
        }

        landingGrid.innerHTML = categories.map(cat => {
            const img = cat.image || '/logo.png';
            // Determine filter pills by checking subcategories or name
            const filterClasses = ['all', cat.name.toLowerCase().includes('gift') ? 'gifts' : '', cat.name.toLowerCase().includes('purse') ? 'purses' : '', cat.name.toLowerCase().includes('toy') ? 'toys' : ''].filter(Boolean).join(' ');
            
            return `
            <a href="category-products.html?cat=${encodeURIComponent(cat.name)}" class="cat-block-card" data-category="${filterClasses}">
                <div class="cat-img-wrapper">
                    <img src="${img}" alt="${cat.name}" onerror="this.src='/logo.png'">
                </div>
                <div class="cat-block-info">
                    <h3>${cat.name}</h3>
                    <span class="item-count">${(cat.subCategories && cat.subCategories.length) ? cat.subCategories.length + ' Subs' : 'View'}</span>
                </div>
            </a>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        landingGrid.innerHTML = '<p>Error loading categories.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderMegaMenu();
    renderHomepageCategories();
    renderFeaturedProducts();
    renderCategoryProducts();
    renderCategoryLanding();
});
