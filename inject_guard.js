const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const filePath = path.join(adminDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('/admin/js/auth-guard.js')) {
    // Inject safely before </body>
    const guardScript = '<script src="/admin/js/auth-guard.js"></script>\n</body>';
    content = content.replace('</body>', guardScript);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Injected auth-guard into ${f}`);
  }
});

console.log('Injection complete.');
