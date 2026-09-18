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
            const token = localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('token');
            const res = await fetch('/api/orders?limit=1000', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                credentials: 'include'
            });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                console.error('[ADMIN ORDERS] Fetch failed with status', res.status, errData);
                throw new Error(errData.message || `HTTP ${res.status}`);
            }
            
            const data = await res.json();
            const fetchedOrders = Array.isArray(data) ? data : (data.orders || data.data || []);
            
            allOrders = fetchedOrders;
            updateOrderKPIs(allOrders);
            applyFilters();
        } catch (err) {
            console.error('Error fetching orders:', err);
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 2rem;">Error connecting to server: ${err.message}</td></tr>`;
        }
    }

    function updateOrderKPIs(orders) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const total = orders.length;
        const thisMonth = orders.filter(o => {
            const d = new Date(o.createdAt);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).length;
        const pending = orders.filter(o => {
            const s = (o.status || o.orderStatus || '').toLowerCase();
            return s === 'pending' || s === 'processing';
        }).length;
        const completed = orders.filter(o => {
            const s = (o.status || o.orderStatus || '').toLowerCase();
            return s === 'completed' || s === 'delivered';
        }).length;

        if (document.getElementById('kpiTotalOrders')) document.getElementById('kpiTotalOrders').innerText = total;
        if (document.getElementById('kpiOrdersThisMonth')) document.getElementById('kpiOrdersThisMonth').innerText = thisMonth;
        if (document.getElementById('kpiOrdersPending')) document.getElementById('kpiOrdersPending').innerText = pending;
        if (document.getElementById('kpiOrdersCompleted')) document.getElementById('kpiOrdersCompleted').innerText = completed;
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
            
            const id = order.orderNumber || (order._id ? order._id.toString().slice(-6) : '');
            const name = order.customer?.name || order.shippingAddress?.fullName || 'Guest';
            const date = new Date(order.createdAt || new Date()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Format Product Summary
            let productStr = '';
            if (order.items && order.items.length > 0) {
                productStr = order.items[0].name || order.items[0].productName || 'Product';
                if (order.items.length > 1) {
                    productStr += ` (+${order.items.length - 1} more)`;
                }
            } else {
                productStr = 'No items';
            }

            const status = (order.orderStatus || order.status || 'pending').toLowerCase();
            const statusClass = (status === 'completed' || status === 'delivered') ? 'status-completed' :
                                status === 'processing' ? 'status-processing' :
                                status === 'manifested' ? 'status-manifested' :
                                status === 'cancelled' ? 'status-cancelled' : 'status-pending';

            const pStatus = (order.paymentStatus || 'pending').toLowerCase();
            const pStatusClass = pStatus === 'paid' ? 'status-paid' :
                                 pStatus === 'failed' ? 'status-failed' : 'status-pending';

            const amount = parseFloat(order.finalPaidAmount || order.totalAmount || order.total || 0).toLocaleString('en-IN', {minimumFractionDigits: 2});
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
                        <a href="javascript:void(0)" class="action-link" onclick="openOrderModal('${order._id}')"><i class="ph ph-eye"></i> View Details</a>
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

// Modal Logic
window.openOrderModal = function(orderId) {
    const order = (allOrders || []).find(o => o._id === orderId);
    if (!order) return;
    
    document.getElementById('modalOrderTitle').textContent = `Order #${order.orderNumber || order._id}`;
    
    const status = (order.orderStatus || order.status || 'pending').toLowerCase();
    const pStatus = (order.paymentStatus || 'pending').toLowerCase();
    
    const statusClass = (status === 'completed' || status === 'delivered') ? 'status-completed' :
                        status === 'processing' ? 'status-processing' :
                        status === 'manifested' ? 'status-manifested' :
                        status === 'cancelled' ? 'status-cancelled' : 'status-pending';

    const pStatusClass = pStatus === 'paid' ? 'status-paid' :
                         pStatus === 'failed' ? 'status-failed' : 'status-pending';

    const dateStr = new Date(order.createdAt || new Date()).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    const customer = order.customer || order.shippingAddress || {};
    
    let itemsHtml = '<ul style="list-style:none; padding:0; margin:0;">';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const img = item.image || item.productImage || 'https://via.placeholder.com/40';
            const name = item.name || item.productName || 'Product';
            const qty = item.quantity || item.qty || 1;
            const price = parseFloat(item.price || item.unitPrice || 0);
            const total = qty * price;
            itemsHtml += `
                <li style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <img src="${img}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                        <div>
                            <div style="font-weight:500;">${name}</div>
                            <div style="font-size:0.85rem; color:#666;">Qty: ${qty} × ₹${price.toFixed(2)}</div>
                        </div>
                    </div>
                    <div style="font-weight:600;">₹${total.toFixed(2)}</div>
                </li>
            `;
        });
    } else {
        itemsHtml += '<li>No items found</li>';
    }
    itemsHtml += '</ul>';

    const subtotal = parseFloat(order.itemsPrice || order.subtotal || order.totalAmount || 0);
    const shipping = parseFloat(order.shippingPrice || order.shippingFee || 0);
    const walletUsed = parseFloat(order.walletDiscount || 0);
    const finalAmount = parseFloat(order.finalPaidAmount || order.total || order.totalAmount || 0);
    
    let cashbackEarned = order.cashbackEarned || 0;
    if (!cashbackEarned) {
        cashbackEarned = walletUsed > 0 ? 1 : 2; 
    }

    document.getElementById('modalOrderContent').innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
            <div>
                <p style="margin:0; font-size:0.9rem; color:#666;">Placed on ${dateStr}</p>
            </div>
            <div style="display:flex; gap:10px;">
                <span class="status-pill ${statusClass}">${status.toUpperCase()}</span>
                <span class="status-pill ${pStatusClass}">${pStatus.toUpperCase()}</span>
            </div>
        </div>
        
        <div style="margin-bottom:20px; padding:15px; background:#f9fafb; border-radius:8px;">
            <h4 style="margin-top:0; margin-bottom:10px; font-size:1rem;">Customer Details</h4>
            <p style="margin:0 0 5px 0;"><strong>Name:</strong> ${customer.name || customer.fullName || 'Guest'}</p>
            <p style="margin:0 0 5px 0;"><strong>Email:</strong> ${customer.email || 'N/A'}</p>
            <p style="margin:0 0 5px 0;"><strong>Phone:</strong> ${customer.phone || 'N/A'}</p>
            <p style="margin:0 0 0 0;"><strong>Address:</strong> ${customer.address || customer.street || ''} ${customer.city || ''} ${customer.state || ''} ${customer.pinCode || customer.zipCode || ''}</p>
        </div>
        
        <div style="margin-bottom:20px;">
            <h4 style="margin-top:0; margin-bottom:10px; font-size:1rem;">Items Ordered</h4>
            ${itemsHtml}
        </div>
        
        <div style="padding:15px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
            <h4 style="margin-top:0; margin-bottom:10px; font-size:1rem;">Reward & Payment Breakdown</h4>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>Item Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <span>Shipping Fee:</span>
                <span>₹${shipping.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#b91c1c;">
                <span>Cashback / Wallet Spent (Deduction):</span>
                <span>-₹${walletUsed.toFixed(2)}</span>
            </div>
            <hr style="border:none; border-top:1px solid #d1d5db; margin:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:1.1rem;">
                <span>Net Amount Paid:</span>
                <span>₹${finalAmount.toFixed(2)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:#15803d; font-weight:600; font-size:0.9rem; background:#dcfce3; padding:8px; border-radius:4px;">
                <span>Cashback Rewarded (Earned):</span>
                <span>+₹${cashbackEarned} credited to wallet</span>
            </div>
        </div>
    `;
    
    document.getElementById('orderDetailsModal').style.display = 'flex';
}

window.closeOrderModal = function() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}
