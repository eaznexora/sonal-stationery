document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/admin/check-auth');
        const data = await res.json();

        if (!data.authenticated) {
            if (window.location.pathname !== '/admin/login.html') {
                window.location.href = '/admin/login.html';
            }
            return;
        }

        const admin = data.admin;
        if (!admin) return;

        const user = data.user || admin;
        console.log('[AUTH-GUARD] Current User:', user.email, 'Permissions:', user.permissions);

        // Superadmin has full access
        if (admin.role === 'superadmin') return;

        // Force hide activity log link for all non-superadmins
        const activityLink = document.querySelector('a[href="activity.html"]');
        if (activityLink) activityLink.style.display = 'none';

        // Block direct access to activity.html
        if (window.location.pathname.endsWith('/admin/activity.html')) {
            alert('Access Denied: Superadmin only.');
            window.location.href = '/admin/dashboard.html'; // Or any safe fallback
            return;
        }

        const perms = admin.permissions || [];
        
        // Define route to permission mapping
        const routeMap = {
            'dashboard': ['/admin/dashboard.html', '/admin/'],
            'categories': ['/admin/categories.html'],
            'products': ['/admin/products.html', '/admin/add-product.html'],
            'products_add': ['/admin/add-product.html'],
            'orders': ['/admin/orders.html'],
            'users': ['/admin/users.html'],
            'inventory': ['/admin/inventory.html'],
            'analytics': ['/admin/analytics.html'],
            'settings': ['/admin/settings.html']
        };

        const sidebarMap = {
            'dashboard': 'a[href="dashboard.html"]',
            'categories': 'a[href="categories.html"]',
            'orders': 'a[href="orders.html"]',
            'users': 'a[href="users.html"]',
            'inventory': 'a[href="inventory.html"]',
            'analytics': 'a[href="analytics.html"]',
            'settings': 'a[href="settings.html"]'
        };

        // Hide unauthorized sidebar links
        Object.keys(sidebarMap).forEach(key => {
            if (!perms.includes(key)) {
                const els = document.querySelectorAll(sidebarMap[key]);
                els.forEach(el => el.style.display = 'none');
            }
        });

        // Locate all Add Product links regardless of leading slashes/paths
        const addProductLinks = document.querySelectorAll('a[href*="add-product.html"], a[data-permission="products_add"]');
        const productListLinks = document.querySelectorAll('a[href*="products.html"]:not([href*="add-product.html"]), a[data-permission="products"]');

        const hasAddProduct = user.role === 'superadmin' || (user.permissions && user.permissions.includes('products_add'));
        const hasProductList = user.role === 'superadmin' || (user.permissions && (user.permissions.includes('products') || user.permissions.includes('products_view')));

        addProductLinks.forEach(link => {
          const parent = link.closest('li') || link;
          if (hasAddProduct) {
            parent.style.setProperty('display', 'block', 'important');
            link.style.setProperty('display', 'block', 'important');
          } else {
            parent.style.setProperty('display', 'none', 'important');
          }
        });

        productListLinks.forEach(link => {
          const parent = link.closest('li') || link;
          if (hasProductList) {
            parent.style.setProperty('display', 'block', 'important');
            link.style.setProperty('display', 'block', 'important');
          } else {
            parent.style.setProperty('display', 'none', 'important');
          }
        });

        // Hide the parent Products dropdown entirely if neither is present
        if (!hasAddProduct && !hasProductList) {
            const parent = document.getElementById('productsDropdownToggle');
            if (parent) parent.style.display = 'none';
        }

        // Guard current route
        const currentPath = window.location.pathname;
        if (currentPath === '/admin/login.html') return;

        let isAllowed = false;
        for (const [perm, routes] of Object.entries(routeMap)) {
            if (routes.some(r => currentPath.endsWith(r))) {
                if (perms.includes(perm)) {
                    isAllowed = true;
                    break;
                }
            }
        }

        // If the current path is NOT covered by routeMap, we assume it's protected by default.
        // Wait, if we iterated and found the route but didn't have perm, isAllowed is false.
        // If we didn't find the route in routeMap (e.g. random page), maybe allow or deny. Let's deny to be safe.
        const isKnownRoute = Object.values(routeMap).flat().some(r => currentPath.endsWith(r));
        if (!isKnownRoute) {
             isAllowed = false; // block unknown pages
        }

        if (!isAllowed) {
            // Find first permitted page
            let fallbackPage = '/admin/dashboard.html'; // Default if they have dashboard
            if (!perms.includes('dashboard')) {
                // Find first perm they DO have
                const firstPerm = perms[0];
                if (firstPerm && routeMap[firstPerm] && routeMap[firstPerm].length > 0) {
                    fallbackPage = routeMap[firstPerm][0];
                } else {
                    fallbackPage = '/admin/login.html'; // No perms at all
                }
            }
            
            alert('Access Denied: You do not have permission to view this section.');
            window.location.href = fallbackPage;
        }

    } catch (error) {
        console.error('Auth Guard Error:', error);
    }
});
