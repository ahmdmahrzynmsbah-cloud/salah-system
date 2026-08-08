const fs = require('fs');
let code = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

// Replace html2pdf__page-break injection with explicit inline styles for page-break-inside
code = code.replace(/breakElements\.forEach\(el => el\.classList\.add\('html2pdf__page-break'\)\);/g, "breakElements.forEach(el => { (el as HTMLElement).style.pageBreakInside = 'avoid'; (el as HTMLElement).style.breakInside = 'avoid'; });");

code = code.replace(/breakElements\.forEach\(el => el\.classList\.remove\('html2pdf__page-break'\)\);/g, "breakElements.forEach(el => { (el as HTMLElement).style.pageBreakInside = ''; (el as HTMLElement).style.breakInside = ''; });");

fs.writeFileSync('src/pages/Invoices.tsx', code);
console.log('Patched Invoices.tsx for PDF page breaks');
