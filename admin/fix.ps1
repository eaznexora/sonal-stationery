$html = Get-Content "d:\MAHENDER\admin\products.html" -Raw

# CSS Updates
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

$cssDiscountOld = @"
        .discount-badge {
            background-color: #fdf3e1;
            color: #b07010;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
"@

$cssDiscountNew = @"
        .discount-badge {
            color: var(--status-out-text);
            font-size: 0.9rem;
            font-weight: 500;
            background: none;
            padding: 0;
        }
"@

$html = $html.Replace($cssDiscountOld, $cssDiscountNew)

# Bulk Actions Text Update
$html = $html.Replace('<div class="bulk-actions">', '<div class="bulk-actions"><span style="font-size:0.9rem; font-weight:500; margin-right:0.5rem; color:var(--text-primary);">Bulk Actions:</span>')

# Table Header Split
$html = $html.Replace('<th>Product Name & SKU</th>', '<th>Product Name</th><th>SKU</th>')

# Table Rows Split
$regexRows = '(?s)<td class="product-cell">\s*<div class="product-info">\s*<span class="product-name">(.*?)</span>\s*<span class="product-sku">(.*?)</span>\s*</div>\s*</td>'
$replaceRows = '<td class="product-name">$1</td><td class="product-sku" style="color:var(--text-secondary);font-size:0.85rem;">$2</td>'
$html = [regex]::Replace($html, $regexRows, $replaceRows)

Set-Content "d:\MAHENDER\admin\products.html" -Value $html
