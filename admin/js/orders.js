document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('ordersBody');
    const searchInput = document.getElementById('searchOrder');
    const statusSelect = document.getElementById('statusFilter');
    const sortSelect = document.getElementById('sortFilter');
    const resetBtn = document.getElementById('resetFilters');

    let allOrders = [];

    // Check auth via localStorage/cookie usually, but we use the API
    async function fetchOrders() {
        try {
            const token = localStorage.getItem('admin_token') || 
                (document.cookie.split('; ').find(row => row.startsWith('admin_token='))?.split('=')[1]);
                
            const res = await fetch('/api/orders', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            
            if (data.success && data.orders) {
                allOrders = data.orders;
                updateKPIs();
                applyFilters();
            } else {
                tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Failed to load orders</td></tr>`;
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Error connecting to server</td></tr>`;
        }
    }

    function updateKPIs() {
        const totalEl = document.querySelector('.kpi-card:nth-child(1) .kpi-value');
        const pendingEl = document.querySelector('.kpi-card:nth-child(2) .kpi-value');
        const completedEl = document.querySelector('.kpi-card:nth-child(3) .kpi-value');
        const monthlyEl = document.querySelector('.kpi-card:nth-child(4) .kpi-value');

        if (totalEl) totalEl.textContent = allOrders.length;
        
        let pending = 0;
        let completed = 0;
        let monthlyRevenue = 0;
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        allOrders.forEach(order => {
            if (order.orderStatus === 'pending') pending++;
            if (order.orderStatus === 'completed') completed++;
            
            const orderDate = new Date(order.createdAt || new Date());
            if (orderDate >= startOfMonth && (order.paymentStatus === 'paid' || order.orderStatus === 'completed')) {
                monthlyRevenue += (order.finalPaidAmount || order.totalAmount || 0);
            }
        });

        if (pendingEl) pendingEl.textContent = pending;
        if (completedEl) completedEl.textContent = completed;
        if (monthlyEl) monthlyEl.textContent = '₹' + monthlyRevenue.toLocaleString('en-IN');
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusFilter = statusSelect.value;
        const sortVal = sortSelect.value;

        let filtered = allOrders.filter(order => {
            const id = (order.orderNumber || order.orderId || order._id.toString().slice(-6)).toLowerCase();
            const name = (order.customer?.name || '').toLowerCase();
            const dateStr = new Date(order.createdAt || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase();
            const product = order.items && order.items.length > 0 ? order.items[0].name.toLowerCase() : '';
            const phone = (order.customer?.phone || '').toLowerCase();
            
            const rowStatus = order.orderStatus || 'pending';

            const matchesSearch = searchTerm === '' || 
                                  id.includes(searchTerm) || 
                                  name.includes(searchTerm) || 
                                  dateStr.includes(searchTerm) || 
                                  product.includes(searchTerm) || 
                                  phone.includes(searchTerm);
                                  
            const matchesStatus = statusFilter === 'all' || rowStatus === statusFilter;

            return matchesSearch && matchesStatus;
        });

        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            const amountA = parseFloat(a.finalPaidAmount || a.totalAmount || 0);
            const amountB = parseFloat(b.finalPaidAmount || b.totalAmount || 0);

            if (sortVal === 'date_desc') return dateB - dateA;
            if (sortVal === 'date_asc') return dateA - dateB;
            if (sortVal === 'amount_desc') return amountB - amountA;
            if (sortVal === 'amount_asc') return amountA - amountB;
            
            return 0;
        });

        renderRows(filtered);
    }

    function renderRows(orders) {
        tbody.innerHTML = '';
        if (orders.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No orders found matching your criteria.</td>`;
            tbody.appendChild(emptyRow);
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement('tr');
            
            const id = order.orderNumber || order.orderId || (order._id ? order._id.toString().slice(-6) : '');
            const name = order.customer?.name || 'Unknown';
            const date = new Date(order.createdAt || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Format Product Summary
            let productStr = '';
            if (order.items && order.items.length > 0) {
                productStr = order.items[0].name;
                if (order.items.length > 1) {
                    productStr += ` (+${order.items.length - 1} more)`;
                }
            } else {
                productStr = 'No items';
            }

            const status = order.orderStatus || 'pending';
            const statusClass = status === 'completed' ? 'status-completed' :
                                status === 'processing' ? 'status-processing' :
                                status === 'manifested' ? 'status-manifested' :
                                status === 'cancelled' ? 'status-cancelled' : 'status-pending';

            const pStatus = order.paymentStatus || 'pending';
            const pStatusClass = pStatus === 'paid' ? 'status-paid' :
                                 pStatus === 'failed' ? 'status-failed' : 'status-pending';

            const amount = parseFloat(order.totalAmount || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
            const walletUsed = parseFloat(order.walletDiscount || 0);
            const walletStr = walletUsed > 0 ? `-₹${walletUsed.toFixed(2)}` : '₹0.00';
            
            const trackingRef = order.trackingId ? `<span class="tracking-ref">REF: ${order.trackingId}</span>` : '';

            tr.innerHTML = `
                <td>#${id}</td>
                <td>${name}</td>
                <td>${date}</td>
                <td>${productStr}</td>
                <td>
                    <span class="status-pill ${statusClass}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    ${trackingRef}
                </td>
                <td><span class="status-pill ${pStatusClass}">${pStatus.charAt(0).toUpperCase() + pStatus.slice(1)}</span></td>
                <td>₹${amount}</td>
                <td style="color:#15803d; font-weight:500;">${walletStr}</td>
                <td>
                    <div class="action-links">
                        <a href="#" class="action-link"><i class="ph ph-truck"></i> Track Order</a>
                        <a href="#" class="action-link"><i class="ph ph-eye"></i> View Details</a>
                        <a href="#" class="action-link"><i class="ph ph-printer"></i> Print Invoice</a>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (statusSelect) statusSelect.addEventListener('change', applyFilters);
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            statusSelect.value = 'all';
            sortSelect.value = 'date_desc';
            applyFilters();
        });
    }

    fetchOrders();
});
