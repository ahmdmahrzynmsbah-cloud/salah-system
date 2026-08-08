const fs = require('fs');
let code = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

code = code.replace(/pagebreak: \{ mode: \['css', 'legacy'\] \}/g, "pagebreak: { mode: ['css', 'legacy'], avoid: '.break-inside-avoid' }");

fs.writeFileSync('src/pages/Invoices.tsx', code);
console.log('Patched Invoices.tsx with explicit avoid selector');
