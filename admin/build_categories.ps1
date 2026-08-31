$htmlPath = "d:\MAHENDER\admin\categories.html"
$content = Get-Content $htmlPath -Raw

# Find the position of </aside>
$asideIndex = $content.IndexOf("</aside>")
if ($asideIndex -gt 0) {
    $headerAndSidebar = $content.Substring(0, $asideIndex + 8)

    $newContent = @"

    <!-- Main Content -->
    <main class="main-content">
        <!-- Header -->
        <header class="top-header">
            <div class="header-title">
                <button class="menu-toggle" id="menuToggle">
                    <i class="ph ph-list"></i>
                </button>
                <h1>Categories</h1>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" onclick="openCategoryModal()">
                    <i class="ph ph-plus"></i> Add Category
                </button>
            </div>
        </header>

        <!-- Dashboard Body -->
        <div class="dashboard-body">
            <div class="table-container" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                            <th style="padding: 1rem 0.5rem; font-weight: 600;">Image</th>
                            <th style="padding: 1rem 0.5rem; font-weight: 600;">Name</th>
                            <th style="padding: 1rem 0.5rem; font-weight: 600;">Subcategories</th>
                            <th style="padding: 1rem 0.5rem; font-weight: 600;">Status</th>
                            <th style="padding: 1rem 0.5rem; font-weight: 600; text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="categoriesTableBody">
                        <!-- Categories injected here -->
                        <tr><td colspan="5" style="text-align:center; padding: 2rem;">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </main>

    <!-- Modal for Create/Edit -->
    <div class="sidebar-overlay" id="categoryModalOverlay" style="z-index: 1000;"></div>
    <div id="categoryModal" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; display: none; z-index: 1001; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        <h2 id="modalTitle" style="margin-bottom: 1.5rem; font-family: var(--font-heading);">Add Category</h2>
        <form id="categoryForm">
            <input type="hidden" id="categoryId">
            <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Category Name *</label>
                <input type="text" id="categoryName" required style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Subcategories (comma separated)</label>
                <input type="text" id="categorySub" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;" placeholder="e.g. Notebooks, Journals">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
                <label style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Status</label>
                <select id="categoryStatus" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 6px;">
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display:block; margin-bottom: 0.5rem; font-weight: 500;">Image Cover</label>
                <input type="file" id="categoryImage" accept="image/*">
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button type="button" class="btn btn-outline danger" onclick="closeCategoryModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Category</button>
            </div>
        </form>
    </div>

    <script>
        // Sidebar Toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (menuToggle) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('open');
            });
        }
        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('open');
            });
        }

        const API_BASE = window.location.origin;

        async function fetchCategories() {
            try {
                const res = await fetch('/api/categories?all=true');
                const categories = await res.json();
                const tbody = document.getElementById('categoriesTableBody');
                tbody.innerHTML = '';
                if(!categories || categories.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 2rem;">No categories found.</td></tr>';
                    return;
                }

                categories.forEach(cat => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-color)';
                    tr.innerHTML = `
                        <td style="padding: 1rem 0.5rem;"><img src="`+cat.image+`" width="40" height="40" style="border-radius:4px; object-fit:cover;"></td>
                        <td style="padding: 1rem 0.5rem; font-weight:500;">`+cat.name+`</td>
                        <td style="padding: 1rem 0.5rem;">`+(cat.subCategories ? cat.subCategories.join(', ') : '')+`</td>
                        <td style="padding: 1rem 0.5rem;">
                            <span style="padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; background: `+(cat.status === 'active' ? '#eaf6f2' : '#f2eee8')+`; color: `+(cat.status === 'active' ? '#4a7c59' : '#6e6b66')+`;">`+cat.status+`</span>
                        </td>
                        <td style="padding: 1rem 0.5rem; text-align: right;">
                            <button onclick='editCategory(`+JSON.stringify(cat).replace(/'/g, "&#39;")+`)' style="background:none; border:none; color:var(--text-secondary); cursor:pointer; margin-right:8px;"><i class="ph ph-pencil-simple" style="font-size:1.2rem;"></i></button>
                            <button onclick="deleteCategory('`+cat._id+`')" style="background:none; border:none; color:#d9534f; cursor:pointer;"><i class="ph ph-trash" style="font-size:1.2rem;"></i></button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch(e) {
                console.error(e);
            }
        }

        function openCategoryModal() {
            document.getElementById('categoryForm').reset();
            document.getElementById('categoryId').value = '';
            document.getElementById('modalTitle').textContent = 'Add Category';
            document.getElementById('categoryModal').style.display = 'block';
            document.getElementById('categoryModalOverlay').style.display = 'block';
        }

        function closeCategoryModal() {
            document.getElementById('categoryModal').style.display = 'none';
            document.getElementById('categoryModalOverlay').style.display = 'none';
        }

        function editCategory(cat) {
            document.getElementById('categoryId').value = cat._id;
            document.getElementById('categoryName').value = cat.name;
            document.getElementById('categorySub').value = cat.subCategories ? cat.subCategories.join(', ') : '';
            document.getElementById('categoryStatus').value = cat.status;
            document.getElementById('modalTitle').textContent = 'Edit Category';
            document.getElementById('categoryModal').style.display = 'block';
            document.getElementById('categoryModalOverlay').style.display = 'block';
        }

        async function deleteCategory(id) {
            if(!confirm('Are you sure you want to delete this category?')) return;
            try {
                await fetch('/api/categories/' + id, { method: 'DELETE' });
                fetchCategories();
            } catch(e) { console.error(e); }
        }

        document.getElementById('categoryForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('categoryId').value;
            const formData = new FormData();
            formData.append('name', document.getElementById('categoryName').value);
            formData.append('subCategories', document.getElementById('categorySub').value);
            formData.append('status', document.getElementById('categoryStatus').value);
            
            const fileInput = document.getElementById('categoryImage');
            if(fileInput.files.length > 0) {
                formData.append('images', fileInput.files[0]);
            }

            const method = id ? 'PUT' : 'POST';
            const url = id ? '/api/categories/' + id : '/api/categories';

            try {
                const res = await fetch(url, { method, body: formData });
                if(res.ok) {
                    closeCategoryModal();
                    fetchCategories();
                } else {
                    const data = await res.json();
                    alert(data.message || 'Error saving category');
                }
            } catch(err) {
                alert('Error: ' + err.message);
            }
        });

        // Init
        document.addEventListener('DOMContentLoaded', () => {
            fetchCategories();
            
            // Set active state in sidebar
            const items = document.querySelectorAll('.nav-item');
            items.forEach(i => i.classList.remove('active'));
            // Set Categories active if nav item exists
            const listCat = document.getElementById('nav-categories');
            if(listCat) listCat.classList.add('active');
        });
    </script>
</body>
</html>
"@

    $finalHtml = $headerAndSidebar + $newContent
    Set-Content $htmlPath $finalHtml
}
