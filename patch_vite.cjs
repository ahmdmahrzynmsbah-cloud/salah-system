const fs = require('fs');
let code = fs.readFileSync('vite.config.ts', 'utf8');

code = code.replace(/registerType: 'autoUpdate',/g, "registerType: 'autoUpdate',\n        workbox: {\n          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024\n        },");

fs.writeFileSync('vite.config.ts', code);
console.log('Patched vite.config.ts');
