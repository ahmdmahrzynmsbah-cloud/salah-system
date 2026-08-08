const fs = require('fs');
const content = fs.readFileSync('src/pages/Invoices.tsx', 'utf-8');

const searchStr = `  const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
    const canvas = await captureInvoiceCanvas(element);

    const pdf = new jsPDF({`;

const replaceStr = `  const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
    const canvas = await captureInvoiceCanvas(element, true);

    const pdf = new jsPDF({`;

fs.writeFileSync('src/pages/Invoices.tsx', content.replace(searchStr, replaceStr));
console.log("Success 2");
