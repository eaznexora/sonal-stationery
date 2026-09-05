document.addEventListener("DOMContentLoaded", () => {
    const activityBody = document.getElementById('activityBody');
    const userFilter = document.getElementById('userFilter');
    const actionFilter = document.getElementById('actionFilter');
    const btnFilter = document.getElementById('btnFilter');
    const btnRefresh = document.getElementById('btnRefresh');
    const pageInfo = document.getElementById('pageInfo');
    const paginationControls = document.getElementById('paginationControls');

    let currentPage = 1;
    let currentLimit = 50;

    const fetchTeamForFilter = async () => {
        try {
            const res = await fetch('/api/admin/settings/team');
            const data = await res.json();
            if (data.success && data.team) {
                data.team.forEach(emp => {
                    const opt = document.createElement('option');
                    opt.value = emp.email;
                    opt.textContent = `${emp.email} (${emp.role})`;
                    userFilter.appendChild(opt);
                });
            }
        } catch(e) {
            console.error('Error fetching team for filter', e);
        }
    };

    const formatDate = (dateString) => {
        const d = new Date(dateString);
        return d.toLocaleString('en-IN', { 
            day: '2-digit', month: 'short', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
        });
    };

    const getActionBadge = (action) => {
        let bg = '#eee';
        let color = '#333';
        let label = action;

        if (action.includes('CREATE') || action.includes('INVITE')) {
            bg = '#e8f5e9'; color = '#2e7d32';
        } else if (action.includes('UPDATE')) {
            bg = '#e3f2fd'; color = '#1976d2';
        } else if (action.includes('DELETE')) {
            bg = '#ffebee'; color = '#c62828';
        } else if (action === 'LOGIN') {
            bg = '#f3e5f5'; color = '#7b1fa2';
        }

        return `<span style="background: ${bg}; color: ${color}; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px;">${label}</span>`;
    };

    const fetchLogs = async (page = 1) => {
        activityBody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Loading activity logs...</td></tr>`;
        try {
            const u = userFilter.value;
            const a = actionFilter.value;
            let query = `?page=${page}&limit=${currentLimit}`;
            if (u) query += `&user=${encodeURIComponent(u)}`;
            if (a) query += `&action=${encodeURIComponent(a)}`;

            const res = await fetch(`/api/admin/activity${query}`);
            const data = await res.json();

            if (data.success) {
                renderLogs(data.logs);
                renderPagination(data.page, data.pages, data.total);
            } else {
                activityBody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--error-color);">Failed to load logs: ${data.message}</td></tr>`;
            }
        } catch (error) {
            activityBody.innerHTML = `<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--error-color);">Network error fetching logs</td></tr>`;
        }
    };

    const renderLogs = (logs) => {
        if (!logs || logs.length === 0) {
            activityBody.innerHTML = `<tr><td colspan="5" style="padding: 3rem; text-align: center; color: var(--text-secondary);">No activity logs found matching the criteria.</td></tr>`;
            return;
        }

        let html = '';
        logs.forEach(log => {
            let detailsStr = '';
            if (log.details) {
                if (typeof log.details === 'string') {
                    detailsStr = log.details;
                } else {
                    detailsStr = `<pre style="margin:0; font-size: 0.8rem; background: #f5f5f5; padding: 4px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(log.details, null, 2)}</pre>`;
                }
            } else {
                detailsStr = '<span style="color: #aaa;">No details</span>';
            }

            const roleBadge = log.role === 'superadmin' 
                ? `<span style="color: #e65100; font-size: 0.7rem; text-transform: uppercase; border: 1px solid #ffe0b2; background: #fff3e0; padding: 2px 4px; border-radius: 3px; margin-left: 6px;">Admin</span>`
                : `<span style="color: #1565c0; font-size: 0.7rem; text-transform: uppercase; border: 1px solid #e3f2fd; background: #f3e5f5; padding: 2px 4px; border-radius: 3px; margin-left: 6px;">Emp</span>`;

            html += `
                <tr style="border-bottom: 1px solid #E2DFD8; transition: background 0.2s;">
                    <td style="padding: 1rem; font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap;">${formatDate(log.timestamp)}</td>
                    <td style="padding: 1rem; font-weight: 500;">${log.user} ${roleBadge}</td>
                    <td style="padding: 1rem;">${getActionBadge(log.action)}</td>
                    <td style="padding: 1rem; font-weight: 500;">${log.target}</td>
                    <td style="padding: 1rem;">${detailsStr}</td>
                </tr>
            `;
        });
        activityBody.innerHTML = html;
    };

    const renderPagination = (page, totalPages, totalDocs) => {
        const start = (page - 1) * currentLimit + 1;
        const end = Math.min(page * currentLimit, totalDocs);
        pageInfo.textContent = totalDocs === 0 ? `Showing 0 entries` : `Showing ${start} to ${end} of ${totalDocs} entries`;

        let controls = '';
        controls += `<button class="btn btn-outline" style="padding: 0.5rem 1rem;" ${page === 1 ? 'disabled' : ''} onclick="changePage(${page - 1})">Previous</button>`;
        controls += `<span style="padding: 0.5rem; font-size: 0.9rem;">Page ${page} of ${totalPages || 1}</span>`;
        controls += `<button class="btn btn-outline" style="padding: 0.5rem 1rem;" ${page >= totalPages ? 'disabled' : ''} onclick="changePage(${page + 1})">Next</button>`;
        
        paginationControls.innerHTML = controls;
    };

    window.changePage = (p) => {
        currentPage = p;
        fetchLogs(currentPage);
    };

    btnFilter.addEventListener('click', () => {
        currentPage = 1;
        fetchLogs(1);
    });

    btnRefresh.addEventListener('click', () => {
        fetchLogs(currentPage);
    });

    // Init
    fetchTeamForFilter();
    fetchLogs(1);
});
