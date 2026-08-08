const fs = require('fs');
const content = fs.readFileSync('src/utils/canvasCapture.ts', 'utf-8');

const searchStr = `    const canvas = await html2canvas(element, {
      scale: 2, // High resolution output
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      width: targetWidth,
      height: targetHeight,
      windowWidth: targetWidth,
      windowHeight: targetHeight,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,`;

const replaceStr = `    const canvas = await html2canvas(element, {
      scale: 2, // High resolution output
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      width: targetWidth,
      windowWidth: targetWidth,
      x: 0,
      y: 0,
      scrollX: 0,
      scrollY: 0,`;

if (content.includes(searchStr)) {
  fs.writeFileSync('src/utils/canvasCapture.ts', content.replace(searchStr, replaceStr));
  console.log("Success");
} else {
  console.log("Not found");
}
