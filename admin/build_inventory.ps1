$html = Get-Content "d:\MAHENDER\admin\inventory.html" -Raw

# 1. Update Cards CSS
$cssCardOld = @"
        .card {
            background-color: var(--bg-white);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card-title {
            color: var(--text-secondary);
            font-size: 0.9rem;
            font-weight: 500;
        }
"@

$cssCardNew = @"
        .card {
            background-color: var(--bg-white);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card-title {
            color: var(--text-primary);
            font-size: 0.95rem;
            font-weight: 500;
        }
"@
$html = $html.Replace($cssCardOld, $cssCardNew)

# 2. Update Toolbar CSS
$cssToolbarOld = @"
        .toolbar-input, .toolbar-select {
            padding: 0.6rem 1rem;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-family: var(--font-body);
            font-size: 0.9rem;
            outline: none;
            color: var(--text-primary);
            background-color: var(--bg-white);
        }
"@
$cssToolbarNew = @"
        .toolbar-input, .toolbar-select {
            padding: 0.6rem 1rem;
            border: 1px solid transparent;
            border-radius: 6px;
            font-family: var(--font-body);
            font-size: 0.9rem;
            outline: none;
            color: var(--text-primary);
            background-color: #f2eee8;
        }
"@
$html = $html.Replace($cssToolbarOld, $cssToolbarNew)

# 3. Update Table Row CSS
$cssTableOld = @"
        /* Inventory Table */
        .table-container {
            width: 100%;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
            white-space: nowrap;
        }

        th, td {
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border-color);
            font-size: 0.9rem;
            vertical-align: middle;
        }

        th {
            background-color: var(--bg-primary);
            color: var(--text-secondary);
            font-weight: 500;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        /* Row Status Tints */
        tr.row-instock { background-color: var(--status-instock-row); }
        tr.row-low { background-color: var(--status-low-row); }
        tr.row-out { background-color: var(--status-out-row); }
        
        tr:hover {
            filter: brightness(0.98);
        }
"@

$cssTableNew = @"
        /* Inventory Table */
        .table-container {
            width: 100%;
            overflow-x: auto;
            padding: 0 1.5rem 1.5rem 1.5rem;
        }

        table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0 8px;
            text-align: left;
            white-space: nowrap;
        }

        th, td {
            padding: 1rem 1.5rem;
            font-size: 0.9rem;
            vertical-align: middle;
        }

        th {
            background-color: var(--bg-white);
            color: var(--text-secondary);
            font-weight: 500;
            position: sticky;
            top: 0;
            z-index: 10;
            border-bottom: 1px solid var(--border-color);
        }

        td {
            border-top: 1px solid transparent;
            border-bottom: 1px solid transparent;
        }
        td:first-child { border-left: 1px solid transparent; border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
        td:last-child { border-right: 1px solid transparent; border-top-right-radius: 4px; border-bottom-right-radius: 4px; }

        /* Row Status Tints */
        tr.row-instock td { 
            background-color: #e8f5e9; 
            border-top-color: #81c784; 
            border-bottom-color: #81c784; 
        }
        tr.row-instock td:first-child { border-left-color: #81c784; }
        tr.row-instock td:last-child { border-right-color: #81c784; }

        tr.row-low td { 
            background-color: #fff8e1; 
            border-top-color: #ffd54f; 
            border-bottom-color: #ffd54f; 
        }
        tr.row-low td:first-child { border-left-color: #ffd54f; }
        tr.row-low td:last-child { border-right-color: #ffd54f; }

        tr.row-out td { 
            background-color: #ffebee; 
            border-top-color: #e57373; 
            border-bottom-color: #e57373; 
        }
        tr.row-out td:first-child { border-left-color: #e57373; }
        tr.row-out td:last-child { border-right-color: #e57373; }
        
        tr:hover td {
            filter: brightness(0.98);
        }
"@
$html = $html.Replace($cssTableOld, $cssTableNew)

# 4. Header Actions & Cards
$headerRegex = '(?s)<div class="header-actions">.*?</header>\s*<!-- Dashboard Body -->\s*<div class="dashboard-body">\s*<!-- Overview Cards -->\s*<div class="overview-cards">.*?</div>\s*</div>\s*</div>\s*<div class="inventory-section">'

$headerNew = @"
            <div class="header-actions" style="display:none;">
            </div>
        </header>

        <!-- Dashboard Body -->
        <div class="dashboard-body">
            
            <!-- Overview Cards -->
            <div class="overview-cards">
                <div class="card">
                    <div class="card-title">Total Inventory</div>
                    <div class="card-value">1378</div>
                </div>
                <div class="card">
                    <div class="card-title">Inventory added this month</div>
                    <div class="card-value">2</div>
                </div>
                <div class="card">
                    <div class="card-title">Orders Pending</div>
                    <div class="card-value">25</div>
                </div>
                <div class="card">
                    <div class="card-title">Orders Completed</div>
                    <div class="card-value">0</div>
                </div>
            </div>
            
            <div class="inventory-section">
"@
$html = [regex]::Replace($html, $headerRegex, $headerNew)

# 5. Filter Toolbar & Tabs & Table Body
$tableRegex = '(?s)<!-- Filter & Search Toolbar -->\s*<div class="toolbar">.*?</tbody>\s*</table>'

$tableNew = @"
                <!-- Filter & Search Toolbar -->
                <div class="toolbar">
                    <div class="toolbar-group">
                        <label for="searchProduct">Search Product</label>
                        <input type="text" id="searchProduct" class="toolbar-input" placeholder="Search by Product Name / SKU...">
                    </div>
                    <div class="toolbar-group">
                        <label for="statusFilter">Status</label>
                        <select id="statusFilter" class="toolbar-select">
                            <option value="all">All Statuses</option>
                            <option value="instock">In Stock</option>
                            <option value="low">Low Stock</option>
                            <option value="out">Out of Stock</option>
                        </select>
                    </div>
                    <div class="toolbar-group">
                        <label for="sortFilter">Sort By</label>
                        <select id="sortFilter" class="toolbar-select">
                            <option value="newest">Newest First</option>
                            <option value="stock_asc">Stock: Low to High</option>
                            <option value="stock_desc">Stock: High to Low</option>
                            <option value="name_asc">Alphabetical</option>
                        </select>
                    </div>
                    <button class="toolbar-reset" id="resetFilters" title="Reset Filters">
                        <i class="ph ph-arrows-counter-clockwise"></i>
                    </button>
                </div>

                <!-- Tabs & Bulk Actions -->
                <div class="tabs-toolbar">
                    <div class="tabs">
                        <div class="tab active" data-tab="all">All Products</div>
                        <div class="tab" data-tab="hidden">Hidden Products</div>
                    </div>
                    <div class="bulk-actions">
                        <span style="font-size:0.9rem; font-weight:500; margin-right:0.5rem; color:var(--text-primary);">Bulk Actions:</span>
                        <button class="btn-icon" title="Toggle Visibility">
                            <i class="ph ph-eye"></i>
                        </button>
                        <div class="pagination-indicator">
                            <button class="btn-icon" style="width:28px;height:28px;font-size:1rem;"><i class="ph ph-caret-left"></i></button>
                            1 / 138
                            <button class="btn-icon" style="width:28px;height:28px;font-size:1rem;"><i class="ph ph-caret-right"></i></button>
                        </div>
                    </div>
                </div>

                <!-- Inventory Table -->
                <div class="table-container">
                    <table id="inventoryTable">
                        <thead>
                            <tr>
                                <th class="checkbox-cell"><input type="checkbox" id="masterCheckbox"></th>
                                <th>Image</th>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Sub-category</th>
                                <th>Stock</th>
                                <th>Batch</th>
                                <th>Stock Status</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody">
                            <tr class="row-instock" data-status="instock">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/e8f5e9/4caf50?text=Jnl" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Hardcover Journal 120 GSM</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-NB-101</td>
                                <td><span class="category-tag">Journals & Diaries</span></td>
                                <td><input type="number" class="stock-input" value="1000" min="0"></td>
                                <td class="batch-text">4/6</td>
                                <td><span class="status-pill status-instock">In Stock</span></td>
                                <td>8/21/2026</td>
                            </tr>
                            <tr class="row-instock" data-status="instock">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/e8f5e9/4caf50?text=Pen" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Calligraphy Fountain Pen</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-PN-204</td>
                                <td><span class="category-tag">Fine Pens</span></td>
                                <td><input type="number" class="stock-input" value="450" min="0"></td>
                                <td class="batch-text">6/12</td>
                                <td><span class="status-pill status-instock">In Stock</span></td>
                                <td>8/21/2026</td>
                            </tr>
                            <tr class="row-low" data-status="low">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/fff8e1/ffb300?text=Hlt" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Pastel Highlighter Set</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-HL-112</td>
                                <td><span class="category-tag">Highlighters</span></td>
                                <td><input type="number" class="stock-input" value="12" min="0"></td>
                                <td class="batch-text">1/2</td>
                                <td><span class="status-pill status-low">Low Stock</span></td>
                                <td>8/20/2026</td>
                            </tr>
                            <tr class="row-out" data-status="out">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/ffebee/f44336?text=Brs" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Brass Desk Clip Set</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-DA-302</td>
                                <td><span class="category-tag">Desk Tools</span></td>
                                <td><input type="number" class="stock-input" value="0" min="0"></td>
                                <td class="batch-text">2/4</td>
                                <td><span class="status-pill status-out">Out of Stock</span></td>
                                <td>8/18/2026</td>
                            </tr>
                            <tr class="row-instock" data-status="instock">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/e8f5e9/4caf50?text=Pln" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Weekly Minimalist Planner 2027</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-PL-005</td>
                                <td><span class="category-tag">Planners</span></td>
                                <td><input type="number" class="stock-input" value="320" min="0"></td>
                                <td class="batch-text">10/20</td>
                                <td><span class="status-pill status-instock">In Stock</span></td>
                                <td>8/21/2026</td>
                            </tr>
                            <tr class="row-low" data-status="low">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td class="product-cell">
                                <td><img src="https://via.placeholder.com/40x40/fff8e1/ffb300?text=Cvs" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Premium Cotton Canvas (8x10)</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-CV-503</td>
                                <td><span class="category-tag">Canvases</span></td>
                                <td><input type="number" class="stock-input" value="2" min="0"></td>
                                <td class="batch-text">2/8</td>
                                <td><span class="status-pill status-low">Low Stock</span></td>
                                <td>8/21/2026</td>
                            </tr>
                            <tr class="row-instock" data-status="instock">
                                <td class="checkbox-cell"><input type="checkbox" class="row-checkbox"></td>
                                <td><img src="https://via.placeholder.com/40x40/e8f5e9/4caf50?text=Wrp" alt="Thumbnail" class="product-thumb"></td>
                                <td class="product-name">Floral Wrapping Paper Roll</td>
                                <td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">SS-WP-709</td>
                                <td><span class="category-tag">Wrapping</span></td>
                                <td><input type="number" class="stock-input" value="500" min="0"></td>
                                <td class="batch-text">10/50</td>
                                <td><span class="status-pill status-instock">In Stock</span></td>
                                <td>8/21/2026</td>
                            </tr>
                        </tbody>
                    </table>
"@

$html = [regex]::Replace($html, $tableRegex, $tableNew)

Set-Content "d:\MAHENDER\admin\inventory.html" -Value $html
