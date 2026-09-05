const fs = require('fs');
const settings = fs.readFileSync('admin/settings.html', 'utf8');
const styleMatch = settings.match(/<style>[\s\S]*?<\/style>/);
let act = fs.readFileSync('admin/activity.html', 'utf8');
act = act.replace('<link rel="stylesheet" href="/admin/css/admin-core.css">', styleMatch[0]);
fs.writeFileSync('admin/activity.html', act);
console.log('Fixed CSS in activity.html');
