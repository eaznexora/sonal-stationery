// js/profile.js

// 1. Global Tab Switcher
window.switchTab = function(event, tabId) {
    if (event && event.preventDefault) event.preventDefault();

    // Hide all content sections
    const sections = document.querySelectorAll('.profile-content-section');
    sections.forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
    });

    // Deactivate all sidebar tab buttons
    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Show target section
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';
    }

    // Highlight active button
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const matching = document.querySelector(`.profile-tab[onclick*="${tabId}"]`);
        if (matching) matching.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Ensure overview tab is open by default
    const defaultTab = document.getElementById('tab-overview');
    if (defaultTab) defaultTab.style.display = 'block';

    loadProfileDetails();
    loadOrderHistory();
    loadSavedAddresses();
    loadWishlist();
    bindLogout();
});

function loadProfileDetails() {
    const user = JSON.parse(localStorage.getItem('sonal_user') || '{}');
    const nameEl = document.querySelector('.profile-name') || document.getElementById('profileName');
    const emailEl = document.querySelector('.profile-email') || document.getElementById('profileEmail');
    const phoneEl = document.querySelector('.profile-phone') || document.getElementById('profilePhone');

    if (nameEl && user.name) nameEl.textContent = user.name;
    if (emailEl && user.email) emailEl.textContent = user.email;
    if (phoneEl && user.phone) phoneEl.textContent = user.phone;
}

function loadOrderHistory() {
    const container = document.querySelector('#tab-orders .orders-container') || document.getElementById('tab-orders');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; padding: 48px 20px; color: #64748b;">
            <p style="font-size: 1.05rem; margin-bottom: 12px;">You haven't placed any orders yet.</p>
            <a href="index.html" style="display: inline-block; padding: 10px 22px; background: #111; color: #fff; text-decoration: none; border-radius: 4px; font-weight: 500;">Start Shopping</a>
        </div>
    `;
}

function loadSavedAddresses() {
    const container = document.querySelector('#tab-addresses .address-grid') || document.getElementById('tab-addresses');
    if (!container) return;

    const saved = JSON.parse(localStorage.getItem('sonal_saved_address') || 'null');
    if (saved && (saved.address || saved.street)) {
        container.innerHTML = `
            <div style="border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; max-width: 480px; background: #fafafa;">
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 1.05rem;">${saved.fullName || saved.name || 'Default Address'}</div>
                <div style="color: #4a5568; line-height: 1.5;">${saved.address || saved.street || ''}${saved.city ? ', ' + saved.city : ''}${saved.state ? ', ' + saved.state : ''} ${saved.pincode || saved.pinCode ? '- ' + (saved.pincode || saved.pinCode) : ''}</div>
                ${saved.phone ? `<div style="color: #718096; margin-top: 6px; font-size: 0.9rem;">Phone: ${saved.phone}</div>` : ''}
            </div>
        `;
    } else {
        container.innerHTML = `
            <div style="padding: 20px; color: #64748b;">
                <p>No saved address found. Addresses entered during checkout or added here will appear automatically.</p>
            </div>
        `;
    }
}

function loadWishlist() {
    const container = document.querySelector('#tab-wishlist .wishlist-grid') || document.getElementById('tab-wishlist');
    if (!container) return;

    const wishlist = JSON.parse(localStorage.getItem('sonal_wishlist') || '[]');
    if (!wishlist.length) {
        container.innerHTML = `
            <div style="padding: 20px; color: #64748b;">
                <p>Your wishlist is currently empty.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = wishlist.map(item => `
        <div style="display: flex; gap: 16px; align-items: center; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 12px;">
            <img src="${item.image || '/images/placeholder.png'}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px;">
            <div style="flex: 1;">
                <h4 style="margin: 0 0 4px 0; font-size: 1rem;">${item.title}</h4>
                <div style="font-weight: 600; color: #1a202c;">₹${item.price}</div>
            </div>
            <button onclick="removeFromWishlist('${item.id}')" style="border: none; background: none; color: #e11d48; cursor: pointer; font-size: 0.9rem; font-weight: 500;">Remove</button>
        </div>
    `).join('');
}

window.removeFromWishlist = function(id) {
    let wishlist = JSON.parse(localStorage.getItem('sonal_wishlist') || '[]');
    wishlist = wishlist.filter(item => item.id !== id);
    localStorage.setItem('sonal_wishlist', JSON.stringify(wishlist));
    loadWishlist();
};

function bindLogout() {
    const logoutBtn = document.querySelector('.profile-tab[style*="ef4444"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('customer_token');
            localStorage.removeItem('sonal_user');
            window.location.href = 'index.html';
        });
    }
}
