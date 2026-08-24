$html = Get-Content "d:\MAHENDER\admin\inventory.html" -Raw

$missingHtml = @"
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>
    </main>

    <script>
        // Sidebar Toggle for Mobile
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebarOverlay');

        function toggleSidebar() {
"@

$regex = '(?s)</tbody>\s*function toggleSidebar\(\) {'

$html = [regex]::Replace($html, $regex, $missingHtml)
Set-Content "d:\MAHENDER\admin\inventory.html" -Value $html
