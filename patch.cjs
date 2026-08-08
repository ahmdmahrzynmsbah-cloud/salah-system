const fs = require('fs');
let code = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

// Replace all html2canvas calls to standardize the capture width.
// We will find all `html2canvas(element, {` and replace them.

code = code.replace(/await html2canvas\(element, \{[\s\S]*?\}\);/g, `await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 850,
        onclone: (clonedDoc) => {
          // Find the invoice container and force its width so it never squishes
          const el = clonedDoc.getElementById('invoice-print-area') || clonedDoc.getElementById('hidden-share-invoice-print');
          if (el) {
            el.style.width = '850px';
            el.style.minWidth = '850px';
            el.style.position = 'static';
            el.style.top = '0';
            el.style.left = '0';
            el.style.opacity = '1';
            el.style.transform = 'none';
          }
          const printInner = el ? (el.firstElementChild || el) : null;
          if (printInner) {
            printInner.style.width = '850px';
            printInner.style.minWidth = '850px';
            printInner.style.maxWidth = '850px';
          }
        }
      });`);

fs.writeFileSync('src/pages/Invoices.tsx', code);
console.log('Patched Invoices.tsx');
