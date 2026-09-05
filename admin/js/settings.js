document.addEventListener('DOMContentLoaded', () => {
    const addEmployeeForm = document.getElementById('addEmployeeForm');
    const teamBody = document.getElementById('teamBody');

    const fetchTeam = async () => {
        try {
            const res = await fetch('/api/admin/settings/team');
            if (res.status === 403) {
                teamBody.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center; color: red;">Forbidden: You do not have Settings access.</td></tr>';
                return;
            }
            const data = await res.json();
            if (data.success) {
                renderTeam(data.team);
            } else {
                console.error(data.message);
            }
        } catch (error) {
            console.error('Error fetching team:', error);
        }
    };

    const renderTeam = (team) => {
        teamBody.innerHTML = '';
        if (team.length === 0) {
            teamBody.innerHTML = '<tr><td colspan="5" style="padding: 1rem; text-align: center;">No employees found.</td></tr>';
            return;
        }

        team.forEach(emp => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #E2DFD8';
            
            const badges = emp.permissions.map(p => `<span style="display:inline-block; padding: 2px 8px; background: #eee; border-radius: 4px; margin: 2px; font-size: 0.8rem;">${p}</span>`).join('');
            
            const statusColor = emp.isActive ? '#4caf50' : '#f44336';
            const statusText = emp.isActive ? 'Active' : 'Inactive';

            tr.innerHTML = `
                <td style="padding: 1rem;">${emp.email}</td>
                <td style="padding: 1rem; text-transform: capitalize;">${emp.role}</td>
                <td style="padding: 1rem;">${emp.role === 'superadmin' ? '<span style="color:#4caf50; font-weight: 500;">All Access</span>' : badges || '-'}</td>
                <td style="padding: 1rem; color: ${statusColor}; font-weight: 500;">${statusText}</td>
                <td style="padding: 1rem; text-align: right;">
                    ${emp.role !== 'superadmin' ? `
                        <button class="btn-edit" data-id="${emp._id}" data-email="${emp.email}" data-perms="${emp.permissions.join(',')}" style="padding: 4px 8px; font-size: 0.8rem; background: #e3f2fd; color: #1976d2; border: none; cursor: pointer; border-radius: 4px; margin-right: 4px;">Edit</button>
                        <button class="btn-toggle-status" data-id="${emp._id}" data-active="${emp.isActive}" style="padding: 4px 8px; font-size: 0.8rem; background: #eee; border: none; cursor: pointer; border-radius: 4px; margin-right: 4px;">Toggle</button>
                        <button class="btn-delete" data-id="${emp._id}" style="padding: 4px 8px; font-size: 0.8rem; background: #ffebee; color: #f44336; border: none; cursor: pointer; border-radius: 4px;">Remove</button>
                    ` : '<span style="color: gray; font-size: 0.85rem;">Protected</span>'}
                </td>
            `;
            teamBody.appendChild(tr);
        });

        document.querySelectorAll('.btn-toggle-status').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                const newStatus = e.target.dataset.active === 'true' ? false : true;
                await updateEmployee(id, { isActive: newStatus });
            });
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                if(confirm('Are you sure you want to remove this employee completely?')) {
                    await removeEmployee(id);
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const email = e.target.dataset.email;
                const perms = e.target.dataset.perms ? e.target.dataset.perms.split(',') : [];
                
                document.getElementById('editEmpId').value = id;
                document.getElementById('editEmpEmail').value = email;
                document.getElementById('editEmpPassword').value = '';
                
                // Reset checkboxes
                document.querySelectorAll('input[name="editPerms"]').forEach(cb => cb.checked = false);
                // Check active ones
                perms.forEach(p => {
                    const cb = document.querySelector(`input[name="editPerms"][value="${p}"]`);
                    if (cb) cb.checked = true;
                });
                
                document.getElementById('editEmployeeModal').style.display = 'flex';
            });
        });
    };

    const updateEmployee = async (id, updates) => {
        try {
            const res = await fetch(`/api/admin/settings/team/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            const data = await res.json();
            if (data.success) {
                fetchTeam();
            } else {
                alert('Failed to update: ' + data.message);
            }
        } catch (error) {
            console.error('Update error', error);
        }
    };

    const removeEmployee = async (id) => {
        try {
            const res = await fetch(`/api/admin/settings/team/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchTeam();
            } else {
                alert('Failed to delete: ' + data.message);
            }
        } catch (error) {
            console.error('Delete error', error);
        }
    };

    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('empEmail').value;
            const password = document.getElementById('empPassword').value;
            const permsChecked = document.querySelectorAll('input[name="perms"]:checked');
            const permissions = Array.from(permsChecked).map(cb => cb.value);

            try {
                const res = await fetch('/api/admin/settings/team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, permissions })
                });
                const data = await res.json();
                
                if (data.success) {
                    addEmployeeForm.reset();
                    fetchTeam();
                    alert('Employee added successfully');
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error('Error adding employee', error);
            }
        });
    }

    const editEmployeeForm = document.getElementById('editEmployeeForm');
    const editEmployeeModal = document.getElementById('editEmployeeModal');
    const btnCancelEdit = document.getElementById('btnCancelEdit');

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', () => {
            editEmployeeModal.style.display = 'none';
        });
    }

    if (editEmployeeForm) {
        editEmployeeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editEmpId').value;
            const password = document.getElementById('editEmpPassword').value;
            const permsChecked = document.querySelectorAll('input[name="editPerms"]:checked');
            const permissions = Array.from(permsChecked).map(cb => cb.value);

            const payload = { permissions };
            if (password.trim() !== '') {
                payload.password = password.trim();
            }

            try {
                const res = await fetch(`/api/admin/settings/team/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                
                if (data.success) {
                    editEmployeeModal.style.display = 'none';
                    fetchTeam();
                    // optional toast
                } else {
                    alert('Error updating employee: ' + data.message);
                }
            } catch (error) {
                console.error('Error updating employee', error);
            }
        });
    }

    // Init
    fetchTeam();
});
