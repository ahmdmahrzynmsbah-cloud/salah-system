const fs = require('fs');
const content = fs.readFileSync('src/pages/Invoices.tsx', 'utf-8');

const searchStr = `  const captureInvoiceCanvas = async (containerEl: HTMLElement): Promise<HTMLCanvasElement> => {
    const card = (containerEl.querySelector('#invoice-card') as HTMLElement) || 
                 (containerEl.firstElementChild as HTMLElement) || 
                 containerEl;

    return await captureElementToCanvas(card, 850);
  };`;

const replaceStr = `  const captureInvoiceCanvas = async (containerEl: HTMLElement, isPdf = false): Promise<HTMLCanvasElement> => {
    const card = (containerEl.querySelector('#invoice-card') as HTMLElement) || 
                 (containerEl.firstElementChild as HTMLElement) || 
                 containerEl;

    return await captureElementToCanvas(card, 850, isPdf);
  };`;

fs.writeFileSync('src/pages/Invoices.tsx', content.replace(searchStr, replaceStr));
console.log("Success 1");
