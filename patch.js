const fs = require('fs');
const content = fs.readFileSync('src/pages/Invoices.tsx', 'utf-8');
const searchStr = `  const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
    const canvas = await captureInvoiceCanvas(element);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297 mm

    const imgData = canvas.toDataURL('image/png', 1.0);
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    // Single A4 page threshold: fit standard invoices (up to 1.35x A4 height) on a single page perfectly
    if (imgHeight <= pdfHeight * 1.35) {
      let printWidth = pdfWidth;
      let printHeight = imgHeight;

      if (printHeight > pdfHeight) {
        printHeight = pdfHeight;
        printWidth = (canvas.width * pdfHeight) / canvas.height;
      }

      const x = (pdfWidth - printWidth) / 2;
      const y = 0;

      console.log('5. PDF image position:', { x, y, printWidth, printHeight, pdfWidth, pdfHeight });

      pdf.addImage(imgData, 'PNG', x, y, printWidth, printHeight, undefined, 'FAST');
    } else {
      console.log('5. PDF image position (dynamic page):', { x: 0, y: 0, printWidth: pdfWidth, printHeight: imgHeight });
      // Dynamic single continuous page for long invoices to ensure zero content slicing or blank pages
      const dynamicPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, imgHeight],
        compress: true
      });
      dynamicPdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
      dynamicPdf.save(filename);
      return;
    }

    pdf.save(filename);
  };`;

const replaceStr = `  const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
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

fs.writeFileSync('src/pages/Invoices.tsx', content.replace(searchStr, replaceStr));
