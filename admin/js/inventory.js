document.addEventListener('DOMContentLoaded', () => {
    // State
    let state = {
        page: 1,
        limit: 10, // Assuming 10 items per page
        search: '',
        status: 'all',
        sortBy: 'newest',
        tab: 'all',
        totalPages: 1
    };

    // Elements
    const elements = {
        kpiTotal: document.getElementById('kpi-total-inventory'),
        kpiAdded: document.getElementById('kpi-added-month'),
        kpiPending: document.getElementById('kpi-orders-pending'),
        kpiCompleted: document.getElementById('kpi-orders-completed'),
        tableBody: document.getElementById('inventoryBody'),
        searchInput: document.getElementById('searchProduct'),
        statusFilter: document.getElementById('statusFilter'),
        sortFilter: document.getElementById('sortFilter'),
        resetBtn: document.getElementById('resetFilters'),
        tabs: document.querySelectorAll('.tab'),
        prevBtn: document.getElementById('prevPageBtn'),
        nextBtn: document.getElementById('nextPageBtn'),
        pageCounter: document.getElementById('pageCounter'),
        masterCheckbox: document.getElementById('masterCheckbox')
    };

    // Fetch KPIs
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/admin/inventory/stats');
            const data = await res.json();
            if (data.success) {
                elements.kpiTotal.textContent = data.stats.totalInventory.toLocaleString();
                elements.kpiAdded.textContent = data.stats.inventoryAddedThisMonth.toLocaleString();
                elements.kpiPending.textContent = data.stats.ordersPending.toLocaleString();
                elements.kpiCompleted.textContent = data.stats.ordersCompleted.toLocaleString();
            }
        } catch (error) {
            console.error('Failed to fetch inventory stats:', error);
        }
    };

    // Fetch Products
    const fetchInventory = async () => {
        try {
            elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">Loading...</td></tr>';
            
            const query = new URLSearchParams({
                page: state.page,
                limit: state.limit,
                search: state.search,
                status: state.status,
                sortBy: state.sortBy,
                tab: state.tab
            }).toString();

            const res = await fetch(`/api/admin/inventory?${query}`);
            const data = await res.json();

            if (data.success) {
                state.totalPages = data.pages || 1;
                state.page = data.page;
                elements.pageCounter.textContent = `${state.page} / ${state.totalPages}`;
                renderTable(data.products);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: red;">Failed to load inventory.</td></tr>';
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
    };

    const renderTable = (products) => {
        elements.tableBody.innerHTML = '';
        
        if (products.length === 0) {
            elements.tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No products found.</td></tr>';
            return;
        }

        products.forEach(p => {
            let rowClass = 'row-instock';
            let pillClass = 'status-instock';
            let statusText = 'In Stock';
            
            if (p.stock === 0) {
                rowClass = 'row-out';
                pillClass = 'status-out';
                statusText = 'Out of Stock';
            } else if (p.stock <= 10) {
                rowClass = 'row-low';
                pillClass = 'status-low';
                statusText = 'Low Stock';
            }

            if (p.status === 'hidden') {
                statusText = 'Hidden';
                pillClass = 'status-out'; // visual fallback
            }

            let imagePath = '/logo.png';
            let rawImage = null;
            
            if (p.images && Array.isArray(p.images) && p.images.length > 0) rawImage = p.images[0];
            else if (p.images && typeof p.images === 'string') rawImage = p.images;
            else if (p.image) rawImage = p.image;
            else if (p.thumbnail) rawImage = p.thumbnail;
            
            if (rawImage && typeof rawImage === 'string') {
                if (rawImage.startsWith('http://') || rawImage.startsWith('https://') || rawImage.startsWith('/')) {
                    imagePath = rawImage;
                } else if (rawImage.startsWith('uploads/')) {
                    imagePath = '/' + rawImage;
                } else {
                    imagePath = '/uploads/' + rawImage;
                }
            }

            const imgHtml = `<img src="${imagePath}" alt="${p.name}" class="product-thumb" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #E2DFD8;" onerror="this.onerror=null; this.src='/logo.png'">`;

            const tr = document.createElement('tr');
            tr.className = rowClass;
            tr.innerHTML = `
                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox" value="${p._id}"></td>
                <td>${imgHtml}</td>
                <td class="product-name">${p.name || '-'}</td>
                <td class="product-sku">${p.sku || '-'}</td>
                <td><span class="category-tag">${p.category || 'Uncategorized'}</span></td>
                <td><input type="number" class="stock-input" data-id="${p._id}" value="${p.stock}" min="0"></td>
                <td class="batch-text">${p.batchQuantity || '-'}</td>
                <td><span class="status-pill ${pillClass}">${statusText}</span></td>
                <td>${formatDate(p.updatedAt)}</td>
            `;
            elements.tableBody.appendChild(tr);
        });

        attachStockListeners();
    };

    // Stock Updating
    const updateStock = async (id, stock, inputEl) => {
        try {
            const res = await fetch(`/api/admin/inventory/${id}/stock`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stock })
            });
            const data = await res.json();
            if (data.success) {
                // Success indicator
                inputEl.style.borderColor = '#4caf50';
                inputEl.style.backgroundColor = '#e8f5e9';
                setTimeout(() => {
                    inputEl.style.borderColor = '';
                    inputEl.style.backgroundColor = '';
                }, 1000);
                // Refresh KPIs silently
                fetchStats();
            } else {
                throw new Error(data.message || 'Error updating stock');
            }
        } catch (error) {
            console.error(error);
            inputEl.style.borderColor = '#f44336';
            alert('Failed to update stock: ' + error.message);
        }
    };

    const attachStockListeners = () => {
        const stockInputs = document.querySelectorAll('.stock-input');
        stockInputs.forEach(input => {
            // Save on Enter
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
            // Save on blur
            input.addEventListener('blur', (e) => {
                const id = e.target.dataset.id;
                let val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 0) val = 0;
                e.target.value = val;
                updateStock(id, val, e.target);
            });
        });
    };

    // Event Listeners
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            state.search = e.target.value;
            state.page = 1;
            fetchInventory();
        }, 500);
    });

    elements.statusFilter.addEventListener('change', (e) => {
        state.status = e.target.value;
        state.page = 1;
        fetchInventory();
    });

    elements.sortFilter.addEventListener('change', (e) => {
        state.sortBy = e.target.value;
        state.page = 1;
        fetchInventory();
    });

    elements.resetBtn.addEventListener('click', () => {
        state = { ...state, search: '', status: 'all', sortBy: 'newest', page: 1 };
        elements.searchInput.value = '';
        elements.statusFilter.value = 'all';
        elements.sortFilter.value = 'newest';
        fetchInventory();
    });

    elements.tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            elements.tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            state.tab = e.target.dataset.tab;
            state.page = 1;
            fetchInventory();
        });
    });

    elements.prevBtn.addEventListener('click', () => {
        if (state.page > 1) {
            state.page--;
            fetchInventory();
        }
    });

    elements.nextBtn.addEventListener('click', () => {
        if (state.page < state.totalPages) {
            state.page++;
            fetchInventory();
        }
    });

    elements.masterCheckbox?.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const rowCheckboxes = document.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(cb => cb.checked = isChecked);
    });

    // Initial Load
    fetchStats();
    fetchInventory();
});
