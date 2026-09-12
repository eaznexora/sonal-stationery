document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const usersTableBody = document.getElementById('usersTableBody');
    const usersLoader = document.getElementById('usersLoader');
    const usersEmptyState = document.getElementById('usersEmptyState');
    
    // Controls
    const searchInput = document.getElementById('searchUser');
    const statusSelect = document.getElementById('statusFilter');
    const resetBtn = document.getElementById('resetFilters');
    const tabs = document.querySelectorAll('.tab-btn');
    
    // Pagination container (create and append if doesn't exist)
    const usersContainer = document.querySelector('.users-container');
    let paginationContainer = document.querySelector('.pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        paginationContainer.style.display = 'flex';
        paginationContainer.style.justifyContent = 'center';
        paginationContainer.style.gap = '10px';
        paginationContainer.style.marginTop = '20px';
        usersContainer.appendChild(paginationContainer);
    }

    // State
    let state = {
        page: 1,
        limit: 10,
        search: '',
        status: 'all',
        totalPages: 1
    };

    // Debounce timer
    let searchTimeout;

    // Initialize
    fetchUsers();

    // Event Listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                state.search = e.target.value;
                state.page = 1;
                fetchUsers();
            }, 300);
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            state.status = e.target.value;
            state.page = 1;
            fetchUsers();
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (statusSelect) statusSelect.value = 'all';
            tabs.forEach(t => t.classList.remove('active'));
            const allTab = document.querySelector('.tab-btn[data-tab="all"]');
            if (allTab) allTab.classList.add('active');
            
            state.search = '';
            state.status = 'all';
            state.page = 1;
            fetchUsers();
        });
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.status = tab.dataset.tab;
            if (statusSelect) statusSelect.value = state.status;
            state.page = 1;
            fetchUsers();
        });
    });

    // Fetch API
    async function fetchUsers() {
        usersTableBody.innerHTML = '';
        usersEmptyState.style.display = 'none';
        usersLoader.style.display = 'block';
        
        try {
            const queryParams = new URLSearchParams({
                page: state.page,
                limit: state.limit,
                search: state.search,
                status: state.status
            });

            const res = await fetch(`/api/users?${queryParams}`);
            const data = await res.json();
            
            usersLoader.style.display = 'none';

            if (!data.users || data.users.length === 0) {
                usersEmptyState.style.display = 'block';
                renderPagination(0, 1);
                return;
            }

            state.totalPages = data.pages || 1;
            renderUsers(data.users);
            renderPagination(state.page, state.totalPages);
            
        } catch (error) {
            console.error('Failed to fetch users:', error);
            usersLoader.style.display = 'none';
            usersEmptyState.textContent = 'Failed to load users.';
            usersEmptyState.style.display = 'block';
        }
    }

    // Render Rows
    function renderUsers(users) {
        usersTableBody.innerHTML = '';
        
        users.forEach(user => {
            const initial = user.name ? user.name.charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : '?');
            const dateJoined = new Date(user.createdAt).toLocaleDateString();
            const phone = user.phone || '—';
            
            const tr = document.createElement('div');
            tr.className = 'user-card';
            tr.innerHTML = `
                <div class="avatar" style="background-color: ${user.isBlocked ? '#7d6b5d' : '#ba4a23'};">${initial}</div>
                <div class="user-name">
                    ${user.name || 'Unknown'}
                    ${user.isBlocked ? '<span style="color:red; font-size:12px; display:block;">(Blocked)</span>' : ''}
                </div>
                <div class="user-email">${user.email}</div>
                <div class="user-phone">${phone}</div>
                <div class="user-date">${dateJoined}</div>
                <div class="user-actions">
                    <button class="action-btn toggle-block-btn" data-id="${user._id}" data-blocked="${user.isBlocked}" title="${user.isBlocked ? 'Unblock User' : 'Block User'}">
                        <i class="ph ${user.isBlocked ? 'ph-check-circle' : 'ph-prohibit'}"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${user._id}" title="Delete User">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            `;
            usersTableBody.appendChild(tr);
        });

        attachActionListeners();
    }

    // Render Pagination
    function renderPagination(currentPage, totalPages) {
        paginationContainer.innerHTML = '';
        if (totalPages <= 1) return;

        const prevBtn = document.createElement('button');
        prevBtn.textContent = 'Prev';
        prevBtn.disabled = currentPage === 1;
        prevBtn.style.padding = '5px 10px';
        prevBtn.addEventListener('click', () => {
            if (state.page > 1) {
                state.page--;
                fetchUsers();
            }
        });
        paginationContainer.appendChild(prevBtn);

        const pageInfo = document.createElement('span');
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        pageInfo.style.alignSelf = 'center';
        paginationContainer.appendChild(pageInfo);

        const nextBtn = document.createElement('button');
        nextBtn.textContent = 'Next';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.style.padding = '5px 10px';
        nextBtn.addEventListener('click', () => {
            if (state.page < totalPages) {
                state.page++;
                fetchUsers();
            }
        });
        paginationContainer.appendChild(nextBtn);
    }

    // Attach Listeners for Actions
    function attachActionListeners() {
        const toggleBtns = document.querySelectorAll('.toggle-block-btn');
        const deleteBtns = document.querySelectorAll('.delete-btn');

        toggleBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const isBlocked = e.currentTarget.dataset.blocked === 'true';
                if (confirm(`Are you sure you want to ${isBlocked ? 'unblock' : 'block'} this user?`)) {
                    await toggleBlockStatus(id);
                }
            });
        });

        deleteBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('Are you sure you want to delete this user? This action cannot be fully undone.')) {
                    await deleteUser(id);
                }
            });
        });
    }

    // API Handlers
    async function toggleBlockStatus(id) {
        try {
            const res = await fetch(`/api/users/${id}/block`, { method: 'PATCH' });
            const data = await res.json();
            if (data.message) {
                alert(data.message);
                fetchUsers();
            } else {
                alert('Failed to update user status');
            }
        } catch (error) {
            console.error('Error toggling block status:', error);
            alert('An error occurred');
        }
    }

    async function deleteUser(id) {
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.message) {
                alert(data.message);
                fetchUsers();
            } else {
                alert('Failed to delete user');
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('An error occurred');
        }
    }
});
