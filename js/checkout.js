// js/checkout.js

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port === '5005' ? '' : 'http://localhost:5005')
    : '';

let checkoutItems = [];
let subtotal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadOrderSummary();
    await tryAutoFillCustomer();

    document.getElementById('placeOrderBtnDesktop').addEventListener('click', handlePlaceOrder);
    document.getElementById('placeOrderBtnMobile').addEventListener('click', handlePlaceOrder);
});

async function loadOrderSummary() {
    const urlParams = new URLSearchParams(window.location.search);
    const isBuyNow = urlParams.get('buyNow') === 'true';

    checkoutItems = [];

    if (isBuyNow) {
        const directItem = sessionStorage.getItem('direct_checkout_item');
        if (directItem) {
            try {
                checkoutItems = [JSON.parse(directItem)];
            } catch (e) {
                console.error("Error parsing direct_checkout_item", e);
            }
        }
    }

    if (!checkoutItems.length) {
        // Read the exact key used by main.js with fallbacks
        const savedCart = localStorage.getItem('sonal_stationary_cart') || 
                          localStorage.getItem('cart') || 
                          localStorage.getItem('sonal_cart');
        if (savedCart) {
            try {
                checkoutItems = JSON.parse(savedCart);
            } catch (e) {
                console.error("Error parsing cart from storage", e);
            }
        }
    }

    if (!checkoutItems || !Array.isArray(checkoutItems) || checkoutItems.length === 0) {
        alert("Your cart is empty. Redirecting to home.");
        window.location.href = 'index.html';
        return;
    }

    renderItems();
    updateTotals();
}

function renderItems() {
    const desktopContainer = document.getElementById('desktopSummaryItems');
    const mobileContainer = document.getElementById('mobileSummaryItems');
    
    let html = '';
    subtotal = 0;

    checkoutItems.forEach(item => {
        const qty = item.qty || item.quantity || 1;
        const price = Number(item.price) || 0;
        const itemTotal = price * qty;
        subtotal += itemTotal;
        const img = item.image || 'https://via.placeholder.com/64';

        html += `
            <div class="summary-item">
                <div class="summary-item-img">
                    <img src="${img}" alt="${item.title}">
                    <span class="summary-item-qty">${qty}</span>
                </div>
                <div class="summary-item-info">
                    <div class="summary-item-title">${item.title}</div>
                    <div class="summary-item-variant">${item.variant || 'Default'}</div>
                </div>
                <div class="summary-item-price">₹${itemTotal.toFixed(2)}</div>
            </div>
        `;
    });

    if (desktopContainer) desktopContainer.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
}

function updateTotals() {
    // Assuming Free Shipping for now or calculated later. Keeping it simple.
    const shipping = subtotal > 500 ? 0 : 50; 
    const total = subtotal + shipping;

    const formattedSubtotal = `₹${subtotal.toFixed(2)}`;
    const formattedShipping = shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`;
    const formattedTotal = `₹${total.toFixed(2)}`;

    document.getElementById('desktopSubtotal').textContent = formattedSubtotal;
    document.getElementById('mobileSubtotal').textContent = formattedSubtotal;
    
    document.getElementById('desktopShipping').textContent = formattedShipping;
    document.getElementById('mobileShipping').textContent = formattedShipping;

    document.getElementById('desktopTotal').textContent = formattedTotal;
    document.getElementById('mobileTotal').textContent = formattedTotal;
    document.getElementById('mobileSummaryTotal').textContent = formattedTotal;

    document.querySelectorAll('.btn-total').forEach(el => {
        el.textContent = formattedTotal;
    });
}

async function tryAutoFillCustomer() {
    const token = localStorage.getItem('customerToken');
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE}/api/auth/customer/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.ok) {
            const customer = await res.json();
            if (customer.name) document.getElementById('fullName').value = customer.name;
            if (customer.email) document.getElementById('email').value = customer.email;
            if (customer.phone) document.getElementById('phone').value = customer.phone;
            
            if (customer.addresses && customer.addresses.length > 0) {
                const defaultAddr = customer.addresses.find(a => a.isDefault) || customer.addresses[0];
                document.getElementById('address').value = defaultAddr.street || '';
                document.getElementById('city').value = defaultAddr.city || '';
                document.getElementById('state').value = defaultAddr.state || '';
                document.getElementById('pinCode').value = defaultAddr.pinCode || '';
            }
        }
    } catch (err) {
        console.error("Error auto-filling customer details:", err);
    }
}

function handlePlaceOrder() {
    const form = document.getElementById('checkoutForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const formData = new FormData(form);
    const orderData = {
        customer: {
            name: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            city: formData.get('city'),
            state: formData.get('state'),
            pinCode: formData.get('pinCode'),
            notes: formData.get('notes')
        },
        items: checkoutItems,
        paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
        total: subtotal + (subtotal > 500 ? 0 : 50)
    };

    console.log("Order Placed!", orderData);
    
    // Simulate successful order
    alert(`Order Placed Successfully!\nTotal: ₹${orderData.total.toFixed(2)}\nPayment Method: ${orderData.paymentMethod.toUpperCase()}`);
    
    // Clear cart/session
    sessionStorage.removeItem('direct_checkout_item');
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('buyNow') !== 'true') {
        localStorage.removeItem('sonal_cart');
    }
    
    window.location.href = 'index.html';
}
