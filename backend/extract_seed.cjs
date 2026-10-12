const fs = require('fs');
const path = require('path');

let code = fs.readFileSync(path.join(__dirname, '../src/seed/seed-data.js'), 'utf8');
code = code.replace(/import\s+[\s\S]*?;/g, '/* import */');
code = code.replace(/export\s+/g, '');
code += '\nfs.writeFileSync(path.join(__dirname, "seed_data.json"), JSON.stringify({ INCHARGE, ADMIN, PROCTORS, STUDENTS, EVENT_REQUESTS }, null, 2));';
eval(code);
console.log('Seed data extracted to backend/seed_data.json successfully');
