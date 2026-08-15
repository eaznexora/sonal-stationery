document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Header Scroll Effect
    const header = document.querySelector('.top-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // 3. Search Logic
    const searchBtns = document.querySelectorAll('button[aria-label="Search"]');
    const searchModal = document.getElementById('searchModal');
    const closeSearchBtn = document.getElementById('closeSearchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const popularSearches = document.getElementById('popularSearches');

    function toggleSearch() {
        if (!searchModal) return;
        searchModal.classList.toggle('active');
        if (searchModal.classList.contains('active') && searchInput) {
            setTimeout(() => searchInput.focus(), 100);
        }
    }

    if (searchBtns) searchBtns.forEach(btn => btn.addEventListener('click', toggleSearch));
    if (closeSearchBtn) closeSearchBtn.addEventListener('click', toggleSearch);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (searchModal && searchModal.classList.contains('active')) toggleSearch();
            const cartDrawer = document.getElementById('cartDrawer');
            const cartOverlay = document.getElementById('cartOverlay');
            if (cartDrawer && cartDrawer.classList.contains('active')) toggleCart();
        }
    });

    // Dummy Search filtering
    const dummyProducts = [
        { title: 'Plush Teddy Bear', category: 'Toys', price: '$45.00', img: 'https://picsum.photos/100/100?random=50' },
        { title: 'Leather Crossbody Bag', category: 'Purses', price: '$120.00', img: 'https://picsum.photos/100/100?random=51' },
        { title: 'Personalized Spa Hamper', category: 'Gifts', price: '$85.00', img: 'https://picsum.photos/100/100?random=52' },
        { title: 'Sleepy Bear Companion', category: 'Toys', price: '$38.00', img: 'https://picsum.photos/100/100?random=53' },
        { title: 'Organic Linen Tote', category: 'Purses', price: '$65.00', img: 'https://picsum.photos/100/100?random=54' }
    ];

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length > 0) {
                popularSearches.style.display = 'none';
                searchResults.style.display = 'block';
                
                const matches = dummyProducts.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
                
                if (matches.length > 0) {
                    searchResults.innerHTML = matches.map(m => `
                        <a href="product.html" class="search-result-item">
                            <img src="${m.img}" alt="${m.title}">
                            <div class="result-info">
                                <h4>${m.title}</h4>
                                <span>${m.category}</span>
                            </div>
                            <div class="result-price">${m.price}</div>
                        </a>
                    `).join('');
                } else {
                    searchResults.innerHTML = `<p class="no-results">No results found for "${query}"</p>`;
                }
            } else {
                popularSearches.style.display = 'block';
                searchResults.style.display = 'none';
                searchResults.innerHTML = '';
            }
        });
    }


    // 4. Cart Drawer Logic
    const cartBtns = document.querySelectorAll('button[aria-label="Cart"]');
    const cartDrawer = document.getElementById('cartDrawer');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCartBtn = document.getElementById('closeCartBtn');

    function toggleCart() {
        if (!cartDrawer || !cartOverlay) return;
        cartDrawer.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    if (cartBtns) cartBtns.forEach(btn => btn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleCart();
    }));
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    // Expose toggleCart globally
    window.toggleCart = toggleCart;

    // Cart State Management (LocalStorage)
    function getCart() {
        return JSON.parse(localStorage.getItem('sonal_stationary_cart')) || [];
    }

    function saveCart(cart) {
        localStorage.setItem('sonal_stationary_cart', JSON.stringify(cart));
        updateCartBadge();
        renderCartDrawer();
        if (window.location.pathname.includes('cart.html')) {
            if (typeof window.renderCartPage === 'function') window.renderCartPage();
        }
    }

    function addToCart(item) {
        const cart = getCart();
        const existingItem = cart.find(i => i.id === item.id && i.variant === item.variant && i.giftNote === item.giftNote);
        if (existingItem) {
            existingItem.qty += item.qty;
        } else {
            cart.push(item);
        }
        saveCart(cart);
        if (!cartDrawer.classList.contains('active')) {
            toggleCart(); // open drawer when added
        }
    }

    function updateCartBadge() {
        const cartBadges = document.querySelectorAll('.cart-count');
        const cart = getCart();
        const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
        cartBadges.forEach(cartBadge => {
            cartBadge.innerText = totalQty;
            cartBadge.style.transform = 'scale(1.2)';
            setTimeout(() => cartBadge.style.transform = 'scale(1)', 200);
        });
    }

    function renderCartDrawer() {
        const cartDrawerBody = document.getElementById('cartDrawerBody');
        const cartDrawerSubtotal = document.getElementById('cartDrawerSubtotal');
        const freeShippingProgress = document.querySelector('.cart-drawer-footer .free-shipping-progress');
        
        if (!cartDrawerBody) return;

        const cart = getCart();
        let subtotal = 0;
        
        if (cart.length === 0) {
            cartDrawerBody.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">Your bag is currently empty.</div>';
            if (cartDrawerSubtotal) cartDrawerSubtotal.innerText = '$0.00';
            if (freeShippingProgress) {
                freeShippingProgress.innerHTML = `
                    <p>Add <strong>$150.00</strong> more for Free Shipping!</p>
                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: 0%;"></div></div>
                `;
            }
            return;
        }

        cartDrawerBody.innerHTML = cart.map((item, index) => {
            subtotal += item.price * item.qty;
            return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-item-details">
                    <h4>${item.title}</h4>
                    <span class="cart-item-variant">Variant: ${item.variant}</span>
                    ${item.giftNote ? `<span class="cart-item-gift">Gift Note Included</span>` : ''}
                    <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                    <div class="cart-qty-control">
                        <button class="qty-btn" onclick="updateItemQty(${index}, -1)">-</button>
                        <span class="qty-num">${item.qty}</span>
                        <button class="qty-btn" onclick="updateItemQty(${index}, 1)">+</button>
                    </div>
                </div>
                <button class="remove-cart-item" aria-label="Remove" onclick="removeItem(${index})"><i data-lucide="x"></i></button>
            </div>
            `;
        }).join('');

        if (cartDrawerSubtotal) cartDrawerSubtotal.innerText = '$' + subtotal.toFixed(2);
        
        if (freeShippingProgress) {
            const threshold = 150;
            const remaining = Math.max(0, threshold - subtotal);
            const percentage = Math.min(100, (subtotal / threshold) * 100);
            
            if (remaining === 0) {
                freeShippingProgress.innerHTML = `<p style="color: var(--accent-sage-dark); font-weight: 500;">You've unlocked Free Shipping!</p>
                <div class="progress-bar-container"><div class="progress-bar-fill" style="width: 100%;"></div></div>`;
            } else {
                freeShippingProgress.innerHTML = `
                    <p>Add <strong>$${remaining.toFixed(2)}</strong> more for Free Shipping!</p>
                    <div class="progress-bar-container"><div class="progress-bar-fill" style="width: ${percentage}%;"></div></div>
                `;
            }
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Expose global functions for onclick
    window.updateItemQty = function(index, delta) {
        const cart = getCart();
        if (cart[index]) {
            cart[index].qty += delta;
            if (cart[index].qty <= 0) cart.splice(index, 1);
            saveCart(cart);
        }
    };

    window.removeItem = function(index) {
        const cart = getCart();
        if (cart[index]) {
            cart.splice(index, 1);
            saveCart(cart);
        }
    };

    window.getCart = getCart;
    window.saveCart = saveCart;

    // Quick Add Listener
    document.querySelectorAll('.btn-quick-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!btn.dataset.id) return; // ignore dummy buttons
            const item = {
                id: btn.dataset.id,
                title: btn.dataset.title,
                price: parseFloat(btn.dataset.price),
                image: btn.dataset.image,
                variant: btn.dataset.variant || 'Default',
                giftNote: '',
                qty: 1
            };
            addToCart(item);
        });
    });

    // PDP Add to Bag Listener
    const pdpPrimaryBtns = document.querySelectorAll('.btn-pdp-primary');
    pdpPrimaryBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!btn.dataset.id) return;
            
            // Get active variant
            const activeSwatch = document.querySelector('.color-swatches .swatch.active');
            let variant = activeSwatch ? (activeSwatch.dataset.color || activeSwatch.style.backgroundColor) : 'Default';
            if (variant.startsWith('var')) { // dirty fallback if dataset is missing
                variant = variant === 'var(--text-primary)' ? 'Black' : (variant === 'var(--bg-secondary)' ? 'Cream' : 'Sage');
            }
            
            // Get quantity
            const qtyInput = document.getElementById('qtyInput');
            const qty = qtyInput ? parseInt(qtyInput.value) : 1;
            
            // Get gift note
            const giftCheckbox = document.getElementById('giftWrapCheckbox');
            const giftMessage = document.getElementById('giftMessage');
            let giftNote = '';
            if (giftCheckbox && giftCheckbox.checked && giftMessage) {
                giftNote = giftMessage.value.trim();
            }
            
            const item = {
                id: btn.dataset.id,
                title: btn.dataset.title,
                price: parseFloat(btn.dataset.price),
                image: btn.dataset.image,
                variant: variant,
                giftNote: giftNote,
                qty: qty
            };
            addToCart(item);
        });
    });

    window.renderCartPage = function() {
        const cartPageItems = document.getElementById('cartPageItems');
        const cartPageSubtotal = document.getElementById('cartPageSubtotal');
        const cartPageShipping = document.getElementById('cartPageShipping');
        const cartPageTotal = document.getElementById('cartPageTotal');
        const cartPageCount = document.getElementById('cartPageCount');
        
        if (!cartPageItems) return;

        const cart = getCart();
        let subtotal = 0;
        
        if (cartPageCount) {
            cartPageCount.innerText = cart.reduce((sum, item) => sum + item.qty, 0);
        }

        if (cart.length === 0) {
            cartPageItems.innerHTML = '<div style="padding: 4rem; text-align: center; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 8px;">Your shopping bag is empty.<br><a href="index.html" style="color: var(--text-primary); text-decoration: underline; margin-top: 1rem; display: inline-block;">Continue Shopping</a></div>';
            if (cartPageSubtotal) cartPageSubtotal.innerText = '$0.00';
            if (cartPageShipping) cartPageShipping.innerText = '$0.00';
            if (cartPageTotal) cartPageTotal.innerText = '$0.00';
            return;
        }

        cartPageItems.innerHTML = cart.map((item, index) => {
            subtotal += item.price * item.qty;
            return `
            <div class="cart-page-item">
                <img src="${item.image}" alt="${item.title}">
                <div class="cart-page-details">
                    <h3>${item.title}</h3>
                    <p class="cart-page-variant">Variant: ${item.variant}</p>
                    ${item.giftNote ? `<p class="cart-page-variant" style="color: var(--accent-sage-dark);">Gift Note: "${item.giftNote}"</p>` : ''}
                    
                    <div class="cart-page-actions">
                        <div class="cart-qty-control">
                            <button class="qty-btn" onclick="updateItemQty(${index}, -1)">-</button>
                            <span class="qty-num">${item.qty}</span>
                            <button class="qty-btn" onclick="updateItemQty(${index}, 1)">+</button>
                        </div>
                        <div class="cart-page-price">$${(item.price * item.qty).toFixed(2)}</div>
                    </div>
                    <button class="btn-remove-text" style="align-self: flex-start; margin-top: 1rem;" onclick="removeItem(${index})">Remove</button>
                </div>
            </div>
            `;
        }).join('');

        if (cartPageSubtotal) cartPageSubtotal.innerText = '$' + subtotal.toFixed(2);
        
        let shipping = 10;
        if (subtotal >= 150) {
            shipping = 0;
        }
        
        if (cartPageShipping) {
            cartPageShipping.innerText = shipping === 0 ? 'Free' : '$' + shipping.toFixed(2);
        }
        
        if (cartPageTotal) {
            cartPageTotal.innerText = '$' + (subtotal + shipping).toFixed(2);
        }
    };

    // Call on load
    updateCartBadge();
    renderCartDrawer();
    if (window.location.pathname.includes('cart.html')) {
        window.renderCartPage();
    }

    // Re-initialize icons in case dynamic content was added
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Expose mobile menu toggle globally
window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobileMenu');
    if (menu) menu.classList.toggle('active');
};
