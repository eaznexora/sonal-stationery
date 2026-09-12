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

async function checkProfileAccess() {
    const gate = document.getElementById('profileAuthGate');
    const main = document.getElementById('profileMainContainer') || document.querySelector('.profile-main');
    
    // 1. Check local storage first for instant render
    let user = null;
    try {
        user = JSON.parse(
            localStorage.getItem('customer_user') ||
            localStorage.getItem('customer_data') ||
            localStorage.getItem('sonal_user') ||
            localStorage.getItem('user') ||
            'null'
        );
    } catch(e) {}

    // 2. Also check backend session via /api/auth/customer/me
    if (!user) {
        try {
            const res = await fetch('/api/auth/customer/me');
            const data = await res.json();
            if (data.success && data.authenticated && data.user) {
                user = data.user;
                localStorage.setItem('sonal_user', JSON.stringify(data.user));
                if (data.token) localStorage.setItem('customer_token', data.token);
            }
        } catch (err) {
            console.error("Session check failed", err);
        }
    }

    // 3. Evaluate state
    if (user) {
        if (gate) {
            gate.style.setProperty('display', 'none', 'important');
        }
        if (main) {
            main.style.setProperty('display', 'block', 'important');
        }
        
        // Ensure overview tab is open by default
        const defaultTab = document.getElementById('tab-overview');
        if (defaultTab) defaultTab.style.display = 'block';

        hydrateAllProfileData(user);
        return true;
    } else {
        if (main) {
            main.style.setProperty('display', 'none', 'important');
        }
        if (gate) {
            gate.style.setProperty('display', 'flex', 'important');
        }
        
        // Automatically trigger auth modal
        triggerAuthModal();
        return false;
    }
}

window.triggerAuthModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const onAuthSuccess = () => {
        if (typeof checkProfileAccess === 'function') {
            checkProfileAccess();
        }
    };

    // Directly call the opened modal without waiting on /api/auth/customer/me network requests
    if (typeof window.openCustomerAuthModal === 'function') {
        window.openCustomerAuthModal(onAuthSuccess, 'Please sign in to access your profile.');
    } else if (typeof window.openAuthModal === 'function') {
        window.openAuthModal(onAuthSuccess, 'Please sign in to access your profile.');
    } else if (typeof window.requireCustomerAuth === 'function') {
        window.requireCustomerAuth(onAuthSuccess, 'Please sign in to access your profile.');
    } else {
        window.location.href = 'index.html?login=true';
    }
};

function hydrateAllProfileData() {
    loadProfileDetails();
    loadOrderHistory();
    loadSavedAddresses();
    loadWishlist();
    bindLogout();
}

document.addEventListener('DOMContentLoaded', () => {
    checkProfileAccess();
});

function loadProfileDetails() {
    const rawUser = localStorage.getItem('customer_user') || 
                    localStorage.getItem('customer_data') || 
                    localStorage.getItem('sonal_user') || 
                    localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    
    const nameEl = document.querySelector('.profile-name') || document.getElementById('profileName');
    const emailEl = document.querySelector('.profile-email') || document.getElementById('profileEmail');
    const phoneEl = document.querySelector('.profile-phone') || document.getElementById('profilePhone');

    if (user) {
        if (nameEl) nameEl.textContent = user.name || user.fullName || 'Valued Customer';
        if (emailEl) emailEl.textContent = user.email || '';
        if (phoneEl) phoneEl.textContent = user.phone || user.mobile || 'Not set';
    }
}

// Edit Profile Modal Logic
window.openEditProfileModal = function() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        const rawUser = localStorage.getItem('customer_user') || localStorage.getItem('customer_data') || localStorage.getItem('sonal_user') || localStorage.getItem('user');
        const user = rawUser ? JSON.parse(rawUser) : {};
        document.getElementById('editName').value = user.name || user.fullName || '';
        document.getElementById('editPhone').value = user.phone || user.mobile || '';
        document.getElementById('editEmail').value = user.email || '';
        modal.style.display = 'flex';
    }
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('editProfileModal');
    if (modal) modal.style.display = 'none';
};

window.saveEditProfile = function(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const email = document.getElementById('editEmail').value;

    const rawUser = localStorage.getItem('customer_user') || localStorage.getItem('customer_data') || localStorage.getItem('sonal_user') || localStorage.getItem('user');
    const user = rawUser ? JSON.parse(rawUser) : {};
    user.name = name;
    user.phone = phone;
    user.email = email;

    localStorage.setItem('sonal_user', JSON.stringify(user));
    localStorage.setItem('customer_user', JSON.stringify(user));
    
    // Opportunistic API push
    const token = localStorage.getItem('customer_token') || localStorage.getItem('customerToken');
    if (token) {
        fetch('/api/customer/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name, phone })
        }).catch(e => console.error(e));
    }

    loadProfileDetails();
    closeEditProfileModal();
    if (typeof triggerToast === 'function') { triggerToast('Profile updated successfully!'); } 
    else { alert('Profile updated successfully!'); }
};

function triggerToast(msg) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#111;color:#fff;padding:12px 20px;border-radius:6px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.display = 'block';
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.display = 'none', 300); }, 2500);
}

// Add Address Modal Logic
window.openAddAddressModal = function() {
    const modal = document.getElementById('addAddressModal');
    if (modal) modal.style.display = 'flex';
};

window.closeAddAddressModal = function() {
    const modal = document.getElementById('addAddressModal');
    if (modal) modal.style.display = 'none';
};

window.saveNewAddress = function(event) {
    if (event) event.preventDefault();
    
    const addressData = {
        fullName: document.getElementById('addFullName').value,
        phone: document.getElementById('addPhone').value,
        address: document.getElementById('addStreet').value,
        city: document.getElementById('addCity').value,
        state: document.getElementById('addState').value,
        pinCode: document.getElementById('addPincode').value
    };

    localStorage.setItem('sonal_saved_address', JSON.stringify(addressData));
    
    // Also save to an array if needed, but the requirements just specify sonal_saved_address
    const allAddresses = JSON.parse(localStorage.getItem('sonal_saved_addresses') || '[]');
    allAddresses.push(addressData);
    localStorage.setItem('sonal_saved_addresses', JSON.stringify(allAddresses));

    loadSavedAddresses();
    closeAddAddressModal();
    if (typeof triggerToast === 'function') { triggerToast('Address saved successfully!'); } 
    else { alert('Address saved successfully!'); }
};

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
    const logoutBtn = document.querySelector('.profile-tab[style*="ef4444"]') || document.getElementById('btnLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', window.handleLogout);
    }
}

window.handleLogout = function() {
    if (confirm('Are you sure you want to log out?')) {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customerToken');
        localStorage.removeItem('token');
        localStorage.removeItem('customer_user');
        localStorage.removeItem('customer_data');
        localStorage.removeItem('sonal_user');
        localStorage.removeItem('user');
        window.location.href = 'profile.html';
    }
};

window.addEventListener('customer:authenticated', (e) => {
    checkProfileAccess();
});
