const fs = require('fs');
const content = fs.readFileSync('src/pages/Invoices.tsx', 'utf-8');

const regex = /const generateInvoicePdf = async \(element: HTMLElement, filename: string\) => \{[\s\S]*?pdf\.save\(filename\);\s*\};/;

const replaceStr = `const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
    const canvas = await captureInvoiceCanvas(element);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  };`;

if (regex.test(content)) {
  fs.writeFileSync('src/pages/Invoices.tsx', content.replace(regex, replaceStr));
  console.log("Success");
} else {
  console.log("Not found");
}
