const fs = require('fs');
const content = fs.readFileSync('src/utils/canvasCapture.ts', 'utf-8');

const searchStr1 = `export async function captureElementToCanvas(containerEl: HTMLElement, customWidth = 850): Promise<HTMLCanvasElement> {`;
const replaceStr1 = `export async function captureElementToCanvas(containerEl: HTMLElement, customWidth = 850, isPdf = false): Promise<HTMLCanvasElement> {`;

const searchStr2 = `      onclone: (clonedDoc) => {
        const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
        hiddenElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });
      }`;
const replaceStr2 = `      onclone: (clonedDoc) => {
        const hiddenElements = clonedDoc.querySelectorAll('.print\\\\:hidden');
        hiddenElements.forEach(el => {
          (el as HTMLElement).style.display = 'none';
        });

        if (isPdf) {
          const clonedCard = clonedDoc.getElementById('invoice-card') || clonedDoc.body.firstElementChild;
          if (clonedCard) {
            const cardWidth = targetWidth;
            const pageHeightPx = cardWidth * (297 / 210);

            const breakableElements = Array.from(clonedCard.querySelectorAll('tr, .break-inside-avoid'));

            breakableElements.forEach(el => {
              const cardRect = clonedCard.getBoundingClientRect();
              const elRect = el.getBoundingClientRect();

              const topRelativeToCard = elRect.top - cardRect.top;
              const bottomRelativeToCard = elRect.bottom - cardRect.top;

              const startPage = Math.floor(topRelativeToCard / pageHeightPx) + 1;
              const endPage = Math.floor(bottomRelativeToCard / pageHeightPx) + 1;

              if (endPage > startPage && topRelativeToCard < startPage * pageHeightPx) {
                const shiftNeeded = (startPage * pageHeightPx) - topRelativeToCard;
                
                if (el.tagName.toLowerCase() === 'tr') {
                  const spacer = clonedDoc.createElement('tr');
                  spacer.style.height = \`\${shiftNeeded + 20}px\`;
                  const td = clonedDoc.createElement('td');
                  td.colSpan = 20;
                  td.style.border = 'none';
                  td.style.padding = '0';
                  td.style.backgroundColor = 'transparent';
                  spacer.appendChild(td);
                  el.parentNode.insertBefore(spacer, el);
                } else {
                  const spacer = clonedDoc.createElement('div');
                  spacer.style.height = \`\${shiftNeeded + 20}px\`;
                  spacer.style.width = '100%';
                  spacer.style.backgroundColor = 'transparent';
                  el.parentNode.insertBefore(spacer, el);
                }
              }
            });
          }
        }
      }`;

let newContent = content.replace(searchStr1, replaceStr1);
// Note: due to backslash escaping in regex or strings, .print\\:hidden needs to be carefully handled.
// In the original, it's .print\\:hidden. In my string above it's .print\\\\:hidden.
// Let's just use string replace.
newContent = newContent.replace(/onclone: \(clonedDoc\) => \{[\s\S]*?\}\);[\s\S]*?\}/, replaceStr2);

fs.writeFileSync('src/utils/canvasCapture.ts', newContent);
console.log("Success");
