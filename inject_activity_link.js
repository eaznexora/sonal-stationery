const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const activityLink = `
            <a href="activity.html" class="nav-item">
                <i class="ph ph-clock-counter-clockwise"></i> Activity
            </a>`;

files.forEach(f => {
  if (f === 'activity.html') return; // already added manually

  const filePath = path.join(adminDir, f);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Regex to match the analytics link
  const analyticsRegex = /(<a href="analytics.html"[^>]*>[\s\S]*?<\/a>)/g;
  
  if (analyticsRegex.test(content)) {
    // Only inject if it doesn't already exist
    if (!content.includes('href="activity.html"')) {
        content = content.replace(analyticsRegex, `$1${activityLink}`);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Injected Activity link in ${f}`);
    } else {
        console.log(`Activity link already exists in ${f}`);
    }
  }
});
console.log('Injection complete.');
