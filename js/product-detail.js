// js/product-detail.js

let slideTimer;
const slideInterval = 2000;
let isPaused = false;

// Image Gallery Swapping
function changeImage(element) {
    const mainImg = document.getElementById('mainProductImage');
    
    // Apply crossfade effect
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = element.src;
        mainImg.style.opacity = '1';
    }, 150); // half of the 350ms transition to swap source

    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    
    // Reset timer on manual click
    startSlideShow();
}

function startSlideShow() {
    clearInterval(slideTimer);
    slideTimer = setInterval(() => {
        if (!isPaused) {
            autoAdvanceImage();
        }
    }, slideInterval);
}

function autoAdvanceImage() {
    const thumbs = document.querySelectorAll('.thumbnail');
    if (thumbs.length <= 1) return;
    
    let currentIndex = 0;
    thumbs.forEach((t, i) => {
        if (t.classList.contains('active')) currentIndex = i;
    });
    
    let nextIndex = (currentIndex + 1) % thumbs.length;
    
    // Perform change without resetting timer (to keep the 2s interval)
    const element = thumbs[nextIndex];
    const mainImg = document.getElementById('mainProductImage');
    
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = element.src;
        mainImg.style.opacity = '1';
    }, 150);

    thumbs.forEach(t => t.classList.remove('active'));
    element.classList.add('active');
}

// Color Swatches Selection
function selectColor(element, colorName) {
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    element.classList.add('active');
    document.getElementById('selectedColorName').innerText = colorName;
}

// Gifting Message Toggle
function toggleGiftMessage() {
    const checkbox = document.getElementById('giftWrapCheckbox');
    const container = document.getElementById('giftMessageContainer');
    if (checkbox.checked) {
        container.classList.add('expanded');
    } else {
        container.classList.remove('expanded');
    }
}

// Quantity Increment/Decrement
function updateQty(change) {
    const input = document.getElementById('qtyInput');
    let val = parseInt(input.value) + change;
    if (val < 1) val = 1;
    if (val > 99) val = 99;
    input.value = val;
}

// Accordion functionality
function toggleAccordion(button) {
    const item = button.parentElement;
    item.classList.toggle('active');
}

// Sticky Cart Logic for Mobile
window.addEventListener('scroll', () => {
    const actions = document.querySelector('.product-actions');
    const stickyCart = document.querySelector('.mobile-sticky-cart');
    
    if (actions && stickyCart) {
        const actionsRect = actions.getBoundingClientRect();
        if (window.innerWidth <= 768 && actionsRect.bottom < 0) {
            stickyCart.classList.add('visible');
        } else {
            stickyCart.classList.remove('visible');
        }
    }
});

// Dynamic Product Loading and "Buy It Now" wiring
document.addEventListener('DOMContentLoaded', async () => {
    // Gallery Hover Pause
    const gallery = document.querySelector('.pdp-gallery');
    if (gallery) {
        gallery.addEventListener('mouseenter', () => isPaused = true);
        gallery.addEventListener('mouseleave', () => isPaused = false);
    }
    
    startSlideShow();

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) return;

    const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? (window.location.port === '5005' ? '' : 'http://localhost:5005')
        : '';
    
    try {
        const res = await fetch(`${API_BASE}/api/products/${productId}`);
        if (!res.ok) throw new Error('Product not found');
        const product = await res.json();
        
        document.querySelector('.product-title').textContent = product.name;
        document.querySelector('.product-price').textContent = `₹${(product.price || 0).toFixed(2)}`;
        document.querySelector('.product-description').textContent = product.description;
        document.querySelector('.category-tag').textContent = product.category;
        
        // Images
        if (product.images && product.images.length > 0) {
            const mainImg = document.getElementById('mainProductImage');
            const firstImg = product.images[0].startsWith('http') ? product.images[0] : API_BASE + product.images[0];
            mainImg.src = firstImg;
            mainImg.alt = product.name;
            
            const thumbRow = document.querySelector('.thumbnail-row');
            thumbRow.innerHTML = product.images.map((img, idx) => {
                const src = img.startsWith('http') ? img : API_BASE + img;
                return `<img class="thumbnail ${idx === 0 ? 'active' : ''}" src="${src}" alt="View ${idx + 1}" onclick="changeImage(this)">`;
            }).join('');
            
            // Restart slideshow to catch new thumbnails
            startSlideShow();
        }

        // Colors
        const colorSelector = document.querySelector('.variant-selector');
        if (product.colors && product.colors.length > 0) {
            colorSelector.style.display = 'block';
            const colorSwatchesContainer = document.querySelector('.color-swatches');
            document.getElementById('selectedColorName').textContent = product.colors[0].name;
            colorSwatchesContainer.innerHTML = product.colors.map((c, i) => `
                <button class="swatch ${i === 0 ? 'active' : ''}" style="background-color: ${c.hex};" aria-label="${c.name}" onclick="selectColor(this, '${c.name}')"></button>
            `).join('');
        } else {
            colorSelector.style.display = 'none';
        }

        // Gift Wrap
        const giftWrapContainer = document.querySelector('.gifting-options');
        if (!product.isGiftWrapAvailable) {
            if(giftWrapContainer) giftWrapContainer.style.display = 'none';
        }

        // Accordions
        const accDetails = document.getElementById('accDetails');
        if (accDetails) {
            accDetails.innerHTML = `
                <p><strong>Description:</strong> ${product.description || 'N/A'}</p>
                ${product.dimensions ? `<p><strong>Dimensions:</strong> ${product.dimensions.length || '-'} × ${product.dimensions.width || '-'} × ${product.dimensions.height || '-'} cm</p>` : ''}
                ${product.weight ? `<p><strong>Weight:</strong> ${product.weight} kg</p>` : ''}
            `;
        }

        const accFeatures = document.getElementById('accFeatures');
        if (accFeatures) {
            if (product.keyFeatures && product.keyFeatures.length > 0) {
                accFeatures.innerHTML = `<ul class="features-list">${product.keyFeatures.map(f => `<li>${f}</li>`).join('')}</ul>`;
            } else {
                accFeatures.innerHTML = `<p>No special features listed.</p>`;
            }
        }

        const accFaqs = document.getElementById('accFaqs');
        if (accFaqs) {
            if (product.faqs && product.faqs.length > 0) {
                accFaqs.innerHTML = `<div class="faqs-list">` + product.faqs.map(faq => `
                    <div class="faq-item">
                        <p class="faq-q"><strong>Q: ${faq.question}</strong></p>
                        <p class="faq-a">${faq.answer}</p>
                    </div>
                `).join('') + `</div>`;
            } else {
                accFaqs.innerHTML = `<p>Standard delivery takes 3-5 business days. Expedited shipping is available at checkout. Enjoy hassle-free free returns within 30 days of purchase.</p>`;
            }
        }

        // Add to Cart btn wire up
        const addToCartBtns = document.querySelectorAll('.btn-add-cart, .btn-pdp-primary');
        addToCartBtns.forEach(btn => {
            btn.dataset.id = product._id;
            btn.dataset.title = product.name;
            btn.dataset.price = product.price;
            if(product.images && product.images.length > 0) {
                btn.dataset.image = product.images[0].startsWith('http') ? product.images[0] : API_BASE + product.images[0];
            }
        });

        // "Buy It Now" logic
        const buyNowBtn = document.querySelector('.btn-pdp-secondary');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => {
                const qty = parseInt(document.getElementById('qtyInput').value) || 1;
                const variant = document.getElementById('selectedColorName') ? document.getElementById('selectedColorName').textContent : 'Default';
                const image = (product.images && product.images.length > 0) ? (product.images[0].startsWith('http') ? product.images[0] : API_BASE + product.images[0]) : '';
                
                const item = {
                    id: product._id,
                    title: product.name,
                    price: product.price,
                    image: image,
                    variant: variant,
                    quantity: qty
                };
                
                sessionStorage.setItem('direct_checkout_item', JSON.stringify(item));
                
                if (typeof window.requireCustomerAuth === 'function') {
                    window.requireCustomerAuth(() => {
                        window.location.href = 'checkout.html?buyNow=true';
                    }, 'Login to complete your purchase');
                } else {
                    window.location.href = 'checkout.html?buyNow=true';
                }
            });
        }

        // Fetch related products
        let relatedRes = await fetch(`${API_BASE}/api/products?category=${encodeURIComponent(product.category)}&status=active&limit=8`);
        let relatedData = await relatedRes.json();
        let related = (Array.isArray(relatedData) ? relatedData : (relatedData.products || relatedData.data || [])).filter(p => p._id !== productId);

        if (related.length < 4) {
            let recentRes = await fetch(`${API_BASE}/api/products?status=active&limit=8`);
            let recentData = await recentRes.json();
            let recent = (Array.isArray(recentData) ? recentData : (recentData.products || recentData.data || [])).filter(p => p._id !== productId);
            
            recent.forEach(r => {
                if (!related.find(p => p._id === r._id)) {
                    related.push(r);
                }
            });
        }

        const pairsSection = document.getElementById('pairsWellWithSection');
        const pairsGrid = document.getElementById('pairsWellWithGrid');

        if (related.length === 0) {
            if (pairsSection) pairsSection.style.display = 'none';
        } else if (pairsGrid) {
            const toRender = related.slice(0, 4);
            pairsGrid.innerHTML = toRender.map(p => {
                const img = p.images && p.images.length > 0 ? (p.images[0].startsWith('http') ? p.images[0] : API_BASE + p.images[0]) : '/logo.png';
                return `
                    <article class="product-card" onclick="window.location.href='product.html?id=${p._id}';" style="cursor: pointer;">
                        <div class="img-wrapper">
                            <img src="${img}" alt="${p.name || 'Product'}">
                            <div class="product-hover">
                                <button class="btn-quick-add" data-id="${p._id}" data-title="${p.name}" data-price="${p.price}" data-image="${img}">Quick Add</button>
                            </div>
                        </div>
                        <div class="product-info">
                            <h3>${p.name || 'Untitled'}</h3>
                            <p class="price">₹${parseFloat(p.price || 0).toFixed(2)}</p>
                        </div>
                    </article>
                `;
            }).join('');
        }

    } catch (err) {
        console.error(err);
        const container = document.querySelector('.pdp-container');
        if (container) container.innerHTML = '<h2>Product not found</h2>';
    }
});
