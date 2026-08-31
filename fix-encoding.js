const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'admin');
const files = fs.readdirSync(directory).filter(f => f.endsWith('.html'));

files.forEach(file => {
    const filepath = path.join(directory, file);
    let content = fs.readFileSync(filepath, 'utf8');
    
    let original = content;
    content = content.replace(/â‚¹/g, '₹');
    content = content.replace(/Ã—/g, '×');
    content = content.replace(/â€”/g, '—');
    
    if (content !== original) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log('Fixed', file);
    }
});
console.log('Done');
