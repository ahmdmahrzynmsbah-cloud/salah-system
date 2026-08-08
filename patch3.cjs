const fs = require('fs');
const content = fs.readFileSync('src/pages/Invoices.tsx', 'utf-8');

const searchStr = `            {printingInvoice.items.length <= 8 && (
              <button 
                onClick={downloadAsImage}
                disabled={isSharingImage}
                className="px-4 sm:px-6 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803D] flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-wait"
              >
                {isSharingImage ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Download className="w-4 h-4 sm:w-5 sm:h-5" />}
                {isSharingImage ? 'جاري المعالجة...' : 'تحميل كصورة'}
              </button>
            )}
            <button 
              onClick={() => setPrintingInvoiceId(null)}
              className="px-4 sm:px-6 py-2 bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-lg text-sm font-bold hover:bg-[#E2E8F0] cursor-pointer"
            >
              عودة
            </button>`;

const replaceStr = `            {printingInvoice.items.length <= 8 && (
              <button 
                onClick={downloadAsImage}
                disabled={isSharingImage}
                className="px-4 sm:px-6 py-2 bg-[#16A34A] text-white rounded-lg text-sm font-bold hover:bg-[#15803D] flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-wait"
              >
                {isSharingImage ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <Download className="w-4 h-4 sm:w-5 sm:h-5" />}
                {isSharingImage ? 'جاري المعالجة...' : 'تحميل كصورة'}
              </button>
            )}
            <button 
              onClick={downloadAsPdf}
              disabled={isSharingImage}
              className="px-4 sm:px-6 py-2 bg-[#DC2626] text-white rounded-lg text-sm font-bold hover:bg-[#B91C1C] flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-75 disabled:cursor-wait"
            >
              {isSharingImage ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <FileText className="w-4 h-4 sm:w-5 sm:h-5" />}
              {isSharingImage ? 'جاري المعالجة...' : 'تحميل PDF'}
            </button>
            {downloadPreviewUrl && (
              <button 
                onClick={handleMobileShare}
                className="px-4 sm:px-6 py-2 bg-[#8B5CF6] text-white rounded-lg text-sm font-bold hover:bg-[#7C3AED] flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                مشاركة
              </button>
            )}
            <button 
              onClick={() => setPrintingInvoiceId(null)}
              className="px-4 sm:px-6 py-2 bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0] rounded-lg text-sm font-bold hover:bg-[#E2E8F0] cursor-pointer"
            >
              عودة
            </button>`;

if (content.includes(searchStr)) {
  fs.writeFileSync('src/pages/Invoices.tsx', content.replace(searchStr, replaceStr));
  console.log("Success");
} else {
  console.log("Not found");
}
