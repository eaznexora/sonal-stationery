# Fix Links in all admin files

$adminFiles = Get-ChildItem -Path d:\MAHENDER\admin -Filter *.html

foreach ($file in $adminFiles) {
    $content = Get-Content $file.FullName -Raw

    # 1. Update Categories link to have href="categories.html" and id="nav-categories"
    $content = $content -replace '<a href="#" class="nav-item">\s*<i class="ph ph-list-dashes"></i> Categories', '<a href="categories.html" class="nav-item" id="nav-categories"><i class="ph ph-list-dashes"></i> Categories'

    # If it is categories.html, remove 'active' from users.html
    if ($file.Name -eq 'categories.html') {
        $content = $content -replace '<a href="users.html" class="nav-item active">', '<a href="users.html" class="nav-item">'
    }

    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
}

# Fix link in storefront categories.html
$storefrontCat = "d:\MAHENDER\categories.html"
if (Test-Path $storefrontCat) {
    $content = Get-Content $storefrontCat -Raw
    $content = $content -replace '<a href="#about" class="nav-link">About</a>', '<a href="index.html#about" class="nav-link">About</a>'
    Set-Content -Path $storefrontCat -Value $content -Encoding UTF8
}

Write-Output "Links fixed."
