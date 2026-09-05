const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const filePath = path.join(adminDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to match the settings link with href="#"
  const regex = /<a href="#" class="nav-item">(\s*)<i class="ph ph-gear"><\/i> Settings(\s*)<\/a>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, '<a href="settings.html" class="nav-item">$1<i class="ph ph-gear"></i> Settings$2</a>');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated settings link in ${f}`);
  }
});
console.log('Interlinking complete.');
