const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const filePath = path.join(adminDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace the exact block
  const searchPattern = /<a href="#" class="nav-item">\s*<i class="ph ph-chart-bar"><\/i> Analytics\s*<\/a>/g;
  const replacement = `<a href="analytics.html" class="nav-item">\n                <i class="ph ph-chart-bar"></i> Analytics\n            </a>`;
  
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content, 'utf-8');
});
console.log('Sidebar links updated!');
