$files = Get-ChildItem -Path d:\MAHENDER\admin -Filter *.html
$regex = '(?s)<a href="#" class="nav-item">\s*<i class="ph ph-archive-box"></i>\s*Inventory\s*</a>'
$replacement = '<a href="inventory.html" class="nav-item">
                <i class="ph ph-archive-box"></i> Inventory
            </a>'

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match $regex) {
        $content = [regex]::Replace($content, $regex, $replacement)
        Set-Content -Path $file.FullName -Value $content
        Write-Host "Updated $($file.Name)"
    }
}
