const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const filePath = path.join(adminDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to match the entire <a> block for Banners
  const regex = /[ \t]*<a [^>]*>\s*<i class="ph ph-image"><\/i>\s*Banners[\s\S]*?<\/a>\r?\n?/g;
  
  if (content.match(regex)) {
    content = content.replace(regex, '');
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Removed Banners from ${f}`);
  }
});

console.log('Done!');
