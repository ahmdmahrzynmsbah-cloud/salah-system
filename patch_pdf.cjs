const fs = require('fs');
let code = fs.readFileSync('src/pages/Invoices.tsx', 'utf8');

// replace jsPDF with html2pdf
code = code.replace("import { jsPDF } from 'jspdf';", "import html2pdf from 'html2pdf.js';");

// replace downloadAsPdf
code = code.replace(/const downloadAsPdf = async \(\) => \{[\s\S]*?setIsSharingImage\(false\);\n    \} catch \(err\) \{/m, `const downloadAsPdf = async () => {
    if (!printRef.current || !printingInvoice) return;
    
    try {
      setIsSharingImage(true);
      const element = (printRef.current.firstElementChild || printRef.current) as HTMLElement;
      
      const opt = {
        margin: [5, 5, 5, 5],
        filename: \`invoice_\${printingInvoice.invoiceNumber}.pdf\`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      
      // Ensure elements with print:break-inside-avoid also have the regular class
      const breakElements = element.querySelectorAll('.print\\\\:break-inside-avoid');
      breakElements.forEach(el => el.classList.add('html2pdf__page-break'));
      
      await html2pdf().set(opt).from(element).save();
      
      // Clean up
      breakElements.forEach(el => el.classList.remove('html2pdf__page-break'));
      
      setIsSharingImage(false);
    } catch (err) {`);

// replace handleDownloadAsPdfFromList
code = code.replace(/const handleDownloadAsPdfFromList = async \(inv: any\) => \{[\s\S]*?setSharingInvoiceId\(null\);\n    \} catch \(err: any\) \{/m, `const handleDownloadAsPdfFromList = async (inv: any) => {
    try {
      setIsSharingImage(true);
      setSharingInvoiceId(inv.id);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const element = document.getElementById('hidden-share-invoice-print') || sharingPrintRef.current;
      if (!element) {
        setIsSharingImage(false);
        setSharingInvoiceId(null);
        alert("حدث خطأ أثناء تحديد الفاتورة في النظام.");
        return;
      }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: \`invoice_\${inv.invoiceNumber}.pdf\`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            windowWidth: 850
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };
      
      const printInner = element.firstElementChild || element;
      if (printInner) {
         (printInner as HTMLElement).style.width = '850px';
         (printInner as HTMLElement).style.minWidth = '850px';
         (printInner as HTMLElement).style.maxWidth = '850px';
      }
      
      const breakElements = element.querySelectorAll('.print\\\\:break-inside-avoid');
      breakElements.forEach(el => el.classList.add('html2pdf__page-break'));

      await html2pdf().set(opt).from(element).save();
      
      breakElements.forEach(el => el.classList.remove('html2pdf__page-break'));

      setIsSharingImage(false);
      setSharingInvoiceId(null);
    } catch (err: any) {`);

fs.writeFileSync('src/pages/Invoices.tsx', code);
console.log('Patched Invoices.tsx for PDF');
