const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin', 'settings.html');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Change active nav item
content = content.replace(
  '<a href="dashboard.html" class="nav-item active">',
  '<a href="dashboard.html" class="nav-item">'
);
content = content.replace(
  '<a href="settings.html" class="nav-item">',
  '<a href="settings.html" class="nav-item active">'
);

// 2. Replace dashboard body
const startBody = content.indexOf('<div class="dashboard-body">');
const endBody = content.indexOf('</main>');

if (startBody !== -1 && endBody !== -1) {
  const newBody = `<div class="dashboard-body">
            <div class="dashboard-grid" style="grid-template-columns: 1fr;">
                <div class="chart-section" style="margin-bottom: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Team & Access Control</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Manage employee access to the admin panel. Only Superadmins can add or remove employees.</p>
                    
                    <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 8px; border: 1px solid #E2DFD8; margin-bottom: 2rem;">
                        <h4 style="margin-bottom: 1rem;">Add New Employee</h4>
                        <form id="addEmployeeForm" style="display: flex; flex-direction: column; gap: 1rem;">
                            <div>
                                <label style="display: block; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">Employee Email</label>
                                <input type="email" id="empEmail" required placeholder="employee@sonalstationery.com" style="width: 100%; padding: 0.75rem; border: 1px solid #E2DFD8; border-radius: 6px; font-family: inherit;">
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 500;">Permissions</label>
                                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; font-size: 0.9rem;">
                                    <label><input type="checkbox" name="perms" value="dashboard"> Dashboard</label>
                                    <label><input type="checkbox" name="perms" value="categories"> Categories</label>
                                    <label><input type="checkbox" name="perms" value="products"> Products (View/Edit)</label>
                                    <label><input type="checkbox" name="perms" value="products_add"> Add Product</label>
                                    <label><input type="checkbox" name="perms" value="orders"> Orders</label>
                                    <label><input type="checkbox" name="perms" value="users"> Users</label>
                                    <label><input type="checkbox" name="perms" value="inventory"> Inventory</label>
                                    <label><input type="checkbox" name="perms" value="analytics"> Analytics</label>
                                    <label><input type="checkbox" name="perms" value="settings"> Settings</label>
                                </div>
                            </div>
                            <button type="submit" class="btn btn-primary" style="align-self: flex-start; margin-top: 0.5rem;">Add Employee</button>
                        </form>
                    </div>

                    <h4 style="margin-bottom: 1rem;">Active Employees</h4>
                    <div class="table-container" style="overflow-x: auto;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead>
                                <tr style="border-bottom: 1px solid #E2DFD8;">
                                    <th style="padding: 1rem;">Email</th>
                                    <th style="padding: 1rem;">Role</th>
                                    <th style="padding: 1rem;">Permissions</th>
                                    <th style="padding: 1rem;">Status</th>
                                    <th style="padding: 1rem; text-align: right;">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="teamBody">
                                <tr><td colspan="5" style="padding: 1rem; text-align: center;">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;
  content = content.substring(0, startBody) + newBody + content.substring(endBody);
}

// 3. Replace script
content = content.replace('<script src="/admin/js/dashboard.js"></script>', '<script src="/admin/js/settings.js"></script>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Settings HTML built successfully');
