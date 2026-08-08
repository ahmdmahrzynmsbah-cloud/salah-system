import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, FileText, X, Printer, Edit, Trash2, ListStart, List, Barcode, Receipt, Save, Download, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { useAppData } from '@/src/context/AppDataContext';
import InvoicePrint from '../components/InvoicePrint';
import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { captureElementToCanvas } from '../utils/canvasCapture';

export default function Invoices() {
  const { invoices, customers, inventory, businessProfile, createInvoice, updateInvoice, deleteInvoice, addCustomer } = useAppData();
  
  const [viewMode, setViewMode] = useState<'create' | 'list'>('create');
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [printingInvoiceId, setPrintingInvoiceId] = useState<string | null>(null);
  const [isPrintDirect, setIsPrintDirect] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  // Form State
  const [isQuote, setIsQuote] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<{ inventoryId: string, qty: number, price: number }[]>([]);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "deferred" | "partial">("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState('');
  
  // Item Search
  const [itemSearchText, setItemSearchText] = useState('');

  const [showDetailsAndPrices, setShowDetailsAndPrices] = useState(true);
  const [autoScannerActive, setAutoScannerActive] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [sharingInvoiceId, setSharingInvoiceId] = useState<string | null>(null);
  const [isSharingImage, setIsSharingImage] = useState(false);
  const [downloadPreviewUrl, setDownloadPreviewUrl] = useState<string | null>(null);
  const [downloadPreviewFilename, setDownloadPreviewFilename] = useState<string>('');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const sharingPrintRef = useRef<HTMLDivElement>(null);

  const printingInvoice = printingInvoiceId ? invoices.find(i => i.id === printingInvoiceId) : null;
  const printingCustomer = printingInvoice ? customers.find(c => c.id === printingInvoice.customerId) : undefined;

  const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const captureInvoiceCanvas = async (containerEl: HTMLElement, isPdf = false): Promise<HTMLCanvasElement> => {
    const card = (containerEl.querySelector('#invoice-card') as HTMLElement) || 
                 (containerEl.firstElementChild as HTMLElement) || 
                 containerEl;

    return await captureElementToCanvas(card, 850, isPdf);
  };

  const downloadAsImage = async () => {
    if (!printRef.current || !printingInvoice) return;
    
    try {
      setIsSharingImage(true);
      const element = (printRef.current.firstElementChild || printRef.current) as HTMLElement;
      const canvas = await captureInvoiceCanvas(element);
      
      const image = canvas.toDataURL('image/png');
      const blob = dataURLtoBlob(image);
      const blobUrl = URL.createObjectURL(blob);
      const prefix = printingInvoice.isQuote ? 'quote_' : 'invoice_';
      const filename = `${prefix}${printingInvoice.invoiceNumber}.png`;
      
      setDownloadPreviewUrl(blobUrl);
      setDownloadPreviewFilename(filename);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsSharingImage(false);
    } catch (err) {
      console.error('Error downloading invoice image:', err?.message || String(err));
      setIsSharingImage(false);
      alert('حدث خطأ أثناء محاولة حفظ المستند كصورة');
    }
  };

  const generateInvoicePdf = async (element: HTMLElement, filename: string) => {
    const canvas = await captureInvoiceCanvas(element, true);

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

    while (heightLeft > 2) {
      position -= pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  };

  const downloadAsPdf = async () => {
    if (!printRef.current || !printingInvoice) return;
    
    try {
      setIsSharingImage(true);
      const element = (printRef.current.firstElementChild || printRef.current) as HTMLElement;
      const prefix = printingInvoice.isQuote ? 'quote_' : 'invoice_';
      await generateInvoicePdf(element, `${prefix}${printingInvoice.invoiceNumber}.pdf`);
      setIsSharingImage(false);
    } catch (err) {
      console.error('Error downloading invoice as PDF:', err?.message || String(err));
      setIsSharingImage(false);
      alert('حدث خطأ أثناء محاولة حفظ المستند كملف PDF');
    }
  };

  const handleMobileShare = async () => {
    if (!downloadPreviewUrl) return;
    try {
      const response = await fetch(downloadPreviewUrl);
      const blob = await response.blob();
      const file = new File([blob], downloadPreviewFilename || 'document.png', { type: 'image/png' });
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: 'مستند مبيعات / عرض سعر',
          text: `مشاركة المستند ${downloadPreviewFilename}`
        });
      } else {
        alert('المشاركة المحلية غير مدعومة في هذا المتصفح. يرجى استخدام زر التحميل العادي بالأسفل.');
      }
    } catch (err) {
      console.error('Error sharing image file:', err?.message || String(err));
    }
  };

  const handleDownloadAsImageFromList = async (inv: any) => {
    try {
      setIsSharingImage(true);
      setSharingInvoiceId(inv.id);

      // Wait for React to mount the hidden preview element
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = document.getElementById('hidden-share-invoice-print') || sharingPrintRef.current;
      if (!element) {
        setIsSharingImage(false);
        setSharingInvoiceId(null);
        alert("حدث خطأ أثناء تحديد المستند في النظام.");
        return;
      }

      const canvas = await captureInvoiceCanvas(element);

      const image = canvas.toDataURL('image/png');
      const blob = dataURLtoBlob(image);
      const blobUrl = URL.createObjectURL(blob);
      const prefix = inv.isQuote ? 'quote_' : 'invoice_';
      const filename = `${prefix}${inv.invoiceNumber}.png`;

      setDownloadPreviewUrl(blobUrl);
      setDownloadPreviewFilename(filename);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsSharingImage(false);
      setSharingInvoiceId(null);
    } catch (err: any) {
      console.error(err?.message || String(err));
      setIsSharingImage(false);
      setSharingInvoiceId(null);
      alert("حدث خطأ أثناء محاولة المعالجة وحفظ المستند كصورة: " + (err?.message || String(err)));
    }
  };

  const handleDownloadAsPdfFromList = async (inv: any) => {
    try {
      setIsSharingImage(true);
      setSharingInvoiceId(inv.id);

      // Wait for React to mount the hidden preview element
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = document.getElementById('hidden-share-invoice-print') || sharingPrintRef.current;
      if (!element) {
        setIsSharingImage(false);
        setSharingInvoiceId(null);
        alert("حدث خطأ أثناء تحديد المستند في النظام.");
        return;
      }

      const printTarget = (element.firstElementChild || element) as HTMLElement;
      const prefix = inv.isQuote ? 'quote_' : 'invoice_';
      await generateInvoicePdf(printTarget, `${prefix}${inv.invoiceNumber}.pdf`);

      setIsSharingImage(false);
      setSharingInvoiceId(null);
    } catch (err: any) {
      console.error(err?.message || String(err));
      setIsSharingImage(false);
      setSharingInvoiceId(null);
      alert("حدث خطأ أثناء محاولة المعالجة وحفظ المستند كملف PDF: " + (err?.message || String(err)));
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const c = customers.find(c => c.id === inv.customerId);
      return inv.invoiceNumber.includes(searchTerm) || (c && c.name.includes(searchTerm));
    });
  }, [invoices, customers, searchTerm]);

  const searchResults = useMemo(() => {
    if (!itemSearchText.trim()) return [];
    const term = itemSearchText.toLowerCase();
    
    // Auto-select if auto scanner is active and exact match with code
    if (autoScannerActive) {
       const exactMatch = inventory.find(i => i.code.toLowerCase() === term);
       if (exactMatch) {
         return [exactMatch];
       }
    }
    
    return inventory.filter(i => 
      i.name.toLowerCase().includes(term) || 
      i.code.toLowerCase().includes(term) ||
      (i.brand && i.brand.toLowerCase().includes(term))
    );
  }, [itemSearchText, inventory, autoScannerActive]);

  useEffect(() => {
     // If auto scanner is active, and there is exactly one result that matches the code exactly
     if (autoScannerActive && searchResults.length === 1 && searchResults[0].code.toLowerCase() === itemSearchText.toLowerCase()) {
        const item = searchResults[0];
        const existing = invoiceItems.find(i => i.inventoryId === item.id);
        if (existing) {
          setInvoiceItems(invoiceItems.map(i => i.inventoryId === item.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
          setInvoiceItems([...invoiceItems, { inventoryId: item.id, qty: 1, price: item.sellPrice }]);
        }
        setItemSearchText('');
        
        // Refocus after 100ms
        setTimeout(() => {
           if (searchInputRef.current) {
             searchInputRef.current.focus();
           }
        }, 100);
     }
  }, [searchResults, autoScannerActive, invoiceItems, itemSearchText]);

  const getInventoryItem = (id: string) => inventory.find(i => i.id === id);
  
  const subtotal = useMemo(() => {
    return invoiceItems.reduce((acc, item) => {
      return acc + (item.price * item.qty);
    }, 0);
  }, [invoiceItems]);
  
  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      return subtotal * (discountValue / 100);
    }
    return discountValue;
  }, [subtotal, discountType, discountValue]);

  const finalTotal = Math.max(0, subtotal - discountAmount);
  
  useEffect(() => {
    if (paymentMethod === 'cash') {
      setPaidAmount(finalTotal);
    } else if (paymentMethod === 'deferred') {
      setPaidAmount(0);
    }
  }, [paymentMethod, finalTotal]);

  useEffect(() => {
    if (printingInvoiceId && isPrintDirect) {
      const handleAfterPrint = () => {
        setPrintingInvoiceId(null);
        setIsPrintDirect(false);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      
      return () => {
        window.removeEventListener('afterprint', handleAfterPrint);
        clearTimeout(timer);
      };
    }
  }, [printingInvoiceId, isPrintDirect]);

  const handleEditClick = (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;
    
    setEditingInvoiceId(invoiceId);
    setIsQuote(inv.isQuote || false);
    if (inv.isQuote && inv.customCustomerName) {
      setSelectedCustomerId('');
      setCustomerNameInput(inv.customCustomerName);
      setCustomerPhoneInput('');
    } else {
      const c = customers.find(c => c.id === inv.customerId);
      if (c) {
        setSelectedCustomerId(c.id);
        setCustomerNameInput(c.name);
        setCustomerPhoneInput(c.phone);
      } else {
        setSelectedCustomerId('');
        setCustomerNameInput('');
        setCustomerPhoneInput('');
      }
    }
    setInvoiceItems(inv.items.map(item => ({ inventoryId: item.itemId, qty: item.quantity, price: item.price })));
    setDiscountValue(inv.discountValue || 0);
    setDiscountType(inv.discountType || 'percentage');
    
    if (inv.paid >= inv.total) {
      setPaymentMethod('cash');
    } else if (inv.paid === 0) {
      setPaymentMethod('deferred');
    } else {
      setPaymentMethod('partial');
    }
    setPaidAmount(inv.paid);
    
    setViewMode('create');
  };

  const handleDeleteClick = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice(invoiceToDelete);
      setInvoiceToDelete(null);
    }
  };

  const handleAddItem = (itemId: string) => {
    const item = getInventoryItem(itemId);
    if (!item) return;
    const existing = invoiceItems.find(i => i.inventoryId === itemId);
    if (existing) {
      setInvoiceItems(invoiceItems.map(i => i.inventoryId === itemId ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setInvoiceItems([...invoiceItems, { inventoryId: itemId, qty: 1, price: item.sellPrice }]);
    }
    setItemSearchText('');
  };

  const handleCreateOrUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (invoiceItems.length === 0) {
      alert('الفاتورة فارغة. يرجى إضافة عناصر.');
      return;
    }
    
    let targetCustomerId = selectedCustomerId;
    let customCustomerName = '';

    if (isQuote) {
      customCustomerName = customerNameInput.trim() || 'عميل نقدي/عرض سعر';
      targetCustomerId = '';
    } else {
      // Auto-create customer if name entered but no selected id
      const finalCustName = customerNameInput.trim() || 'عميل نقدي';
      
      if (!targetCustomerId) {
        // Find if a customer with this name already exists
        const existingCId = customers.find(c => c.name === finalCustName);
        if (existingCId) {
          targetCustomerId = existingCId.id;
        } else {
          // Create the customer automatically!
          try {
            const serialNumber = `CUST-${1000 + customers.length + 1}`;
            const uidStr = 'main_store';
            const custRef = doc(collection(db, 'users', uidStr, 'customers'));
            await setDoc(custRef, {
              ownerId: uidStr,
              serialNumber,
              name: finalCustName,
              phone: customerPhoneInput.trim(),
              balance: 0,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
            targetCustomerId = custRef.id;
            
            // Push to local customers list representation to ensure immediate UI and cache updating
            customers.push({
              id: custRef.id,
              serialNumber,
              name: finalCustName,
              phone: customerPhoneInput.trim(),
              balance: 0
            });
          } catch (custErr) {
            console.error('Error auto-creating customer:', custErr?.message || String(custErr));
            alert('تعذر إنشاء حساب العميل تلقائياً، يرجى تسجيل العميل يدوياً من شاشة العملاء.');
            return;
          }
        }
      }
    }

    const activeInvoice = editingInvoiceId ? invoices.find(i => i.id === editingInvoiceId) : null;
    let hasStockIssues = false;
    
    if (!isQuote) {
      for (const vItem of invoiceItems) {
        const invItem = getInventoryItem(vItem.inventoryId);
        const oldQty = activeInvoice ? (activeInvoice.items.find(i => i.itemId === vItem.inventoryId)?.quantity || 0) : 0;
        const available = invItem ? invItem.quantity + oldQty : 0;

        if (!invItem || available < vItem.qty) {
          hasStockIssues = true;
          alert(`عذراً، الكمية المتوفرة من ${invItem?.name || ''} غير كافية (المتاح: ${available})`);
          break;
        }
      }
    }

    if (hasStockIssues) return;

    const mappedItems = invoiceItems.map(item => ({
      itemId: item.inventoryId,
      quantity: item.qty,
      price: item.price
    }));

    try {
      const isEdit = !!(editingInvoiceId && activeInvoice);
      const invoicePayload: any = {
        date: isEdit ? activeInvoice.date : new Date().toISOString(),
        customerId: targetCustomerId,
        items: mappedItems,
        total: finalTotal,
        paid: isQuote ? 0 : paidAmount,
        discountType,
        discountValue,
        isQuote
      };

      if (isQuote && customCustomerName) {
        invoicePayload.customCustomerName = customCustomerName;
      }

      if (isEdit) {
        await updateInvoice(editingInvoiceId!, invoicePayload);
      } else {
        await createInvoice(invoicePayload);
      }

      alert(editingInvoiceId ? 'تم تحديث الفاتورة بنجاح!' : 'تم إصدار الفاتورة أو عرض السعر بنجاح!');
      resetForm();
      setViewMode('list');
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ غير متوقع أثناء معالجة الفاتورة.');
    }
  };

  const resetForm = () => {
    setEditingInvoiceId(null);
    setIsQuote(false);
    setSelectedCustomerId('');
    setCustomerNameInput('');
    setIsCustomCustomer(false);
    setCustomerPhoneInput('');
    setInvoiceItems([]);
    setDiscountValue(0);
    setPaymentMethod('cash');
    setPaidAmount(0);
    setItemSearchText('');
  };

  return (
    <>
      {printingInvoice && (
        <div className={`fixed inset-0 z-50 overflow-y-auto print:bg-white print:p-0 bg-[#F1F5F9] print:static print:h-auto print:overflow-visible print:block`}>
          <div className="p-3 sm:p-4 flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 justify-center items-center border-b border-[#E2E8F0] print:hidden bg-white shadow-sm sticky top-0 z-10">
            <button 
              onClick={() => {
                setTimeout(() => window.print(), 100);
              }}
              className="px-4 sm:px-6 py-2 bg-[#2180B2] text-white rounded-lg text-sm font-bold hover:bg-[#1A6B94] flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              طباعة {printingInvoice.isQuote ? 'عرض السعر' : 'الفاتورة'}
            </button>
            {printingInvoice.items.length <= 8 && (
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
            </button>
          </div>
          <div id="invoice-print-area" className="p-2 sm:p-8 flex justify-start sm:justify-center overflow-x-auto print:p-0 print:overflow-visible" ref={printRef}>
            <InvoicePrint 
              invoice={printingInvoice} 
              customer={printingCustomer} 
              inventory={inventory} 
              profile={businessProfile} 
            />
          </div>
        </div>
      )}

      <div className="space-y-6 print:hidden">
        
        {/* Top Toggle Bar */}
        <div className="flex gap-4 p-2 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
          <button 
            onClick={() => { resetForm(); setViewMode('create'); }}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${viewMode === 'create' ? 'bg-[#2180B2] text-white shadow-md' : 'text-[#475569] hover:bg-white hover:shadow-sm bg-transparent border-none'}`}
          >
            <FileText className="w-5 h-5" />
            إنشاء فاتورة بيع جديدة
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${viewMode === 'list' ? 'bg-[#2180B2] text-white shadow-md' : 'text-[#475569] hover:bg-white hover:shadow-sm bg-transparent border-none'}`}
          >
            <List className="w-5 h-5" />
            سجل المبيعات وقائمة الفواتير
          </button>
        </div>

        {viewMode === 'create' && (
          <form onSubmit={handleCreateOrUpdateInvoice} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Account & Payment */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 flex flex-col h-fit sticky top-24">
               <div className="flex items-center gap-2 mb-6 text-[#1E293B]">
                  <Receipt className="w-6 h-6 text-[#2180B2]" />
                  <h3 className="font-bold text-lg">الحساب وإتمام الدفعية</h3>
               </div>

               <div className="space-y-4">
                  {/* نوع المعاملة / الفاتورة */}
                  <div className="space-y-1.5 mb-2">
                    <label className="text-xs font-bold text-[#475569] block">نوع الفاتورة أو المستند</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuote(false);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-none cursor-pointer text-center ${!isQuote ? 'bg-[#2180B2] text-white shadow-sm' : 'bg-transparent text-[#64748B] hover:text-[#334155]'}`}
                      >
                        💼 فاتورة مبيعات معتمدة
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsQuote(true);
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all border-none cursor-pointer text-center ${isQuote ? 'bg-[#D97706] text-white shadow-sm' : 'bg-transparent text-[#64748B] hover:text-[#334155]'}`}
                      >
                        📄 عرض سعر جديد
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569] block">اسم العميل</label>
                    {isQuote ? (
                      <input 
                        type="text"
                        placeholder="اكتب اسم العميل يدوياً..."
                        value={customerNameInput}
                        onChange={e => setCustomerNameInput(e.target.value)}
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#D97706] focus:outline-none bg-white font-bold text-right"
                        required
                      />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {isCustomCustomer ? (
                            <input 
                              type="text"
                              placeholder="اكتب اسم العميل يدوياً..."
                              value={customerNameInput}
                              onChange={e => setCustomerNameInput(e.target.value)}
                              className="flex-grow border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none bg-white font-bold text-right"
                              required
                            />
                          ) : (
                            <select 
                              value={selectedCustomerId}
                              onChange={e => {
                                setSelectedCustomerId(e.target.value);
                                const c = customers.find(c => c.id === e.target.value);
                                if (c) {
                                  setCustomerNameInput(c.name);
                                  setCustomerPhoneInput(c.phone);
                                } else {
                                  setCustomerNameInput('');
                                  setCustomerPhoneInput('');
                                }
                              }}
                              className="flex-grow border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none bg-white"
                            >
                              <option value="">اختيار عميل مسجل...</option>
                              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomCustomer(!isCustomCustomer);
                              setSelectedCustomerId('');
                              setCustomerNameInput('');
                              setCustomerPhoneInput('');
                            }}
                            className="px-3 py-2 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs font-bold text-[#475569] hover:bg-[#E2E8F0] whitespace-nowrap cursor-pointer transition-colors"
                          >
                            {isCustomCustomer ? 'اختر مسجل 📋' : 'كتابة يدوي ✍️'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-[#475569]">رقم الهاتف (جوال)</label>
                    {isQuote || isCustomCustomer ? (
                      <input 
                        type="text" 
                        placeholder="مثال: 055xxxxxxx" 
                        value={customerPhoneInput} 
                        onChange={e => setCustomerPhoneInput(e.target.value)}
                        className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none bg-white font-mono" dir="ltr"
                      />
                    ) : (
                      <input 
                        type="text" placeholder="مثال: 055xxxxxxx" value={customerPhoneInput} readOnly
                        className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2 text-sm bg-[#F8FAFC]" dir="ltr"
                      />
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-[#475569]">المجموع الأولي:</span>
                      <span className="font-bold text-lg">{subtotal.toLocaleString()} <span className="text-sm text-[#94A3B8]">ج.م</span></span>
                    </div>

                    <div className="flex items-center justify-between mb-4 gap-2">
                       <span className="font-bold text-[#475569] text-sm">تطبيق خصم:</span>
                       <div className="flex w-full max-w-[200px]">
                         <input 
                           type="number" min="0" value={discountValue} onChange={e => setDiscountValue(Number(e.target.value))}
                           className="w-full border border-l-0 border-[#E2E8F0] rounded-r-lg px-3 py-1 text-sm focus:outline-none"
                         />
                         <select 
                           value={discountType} onChange={e => setDiscountType(e.target.value as "percentage" | "fixed")}
                           className="border border-[#E2E8F0] rounded-l-lg px-2 py-1 text-sm bg-[#F8FAFC] focus:outline-none"
                         >
                           <option value="percentage">% نسبة مئوية</option>
                           <option value="fixed">مبلغ ثابت</option>
                         </select>
                       </div>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center mb-2 px-3 py-1.5 text-[#DC2626] font-bold text-sm bg-[#FEF2F2] rounded-lg border border-[#FCA5A5]/30">
                        <span className="flex items-center gap-1.5">
                          <span>المبلغ المخصوم</span>
                          <span className="text-xs bg-[#FCA5A5]/40 text-[#B91C1C] px-1.5 py-0.5 rounded-md font-mono">
                            ({discountType === 'percentage' ? `${discountValue}%` : 'ثابت'})
                          </span>
                          :
                        </span>
                        <span className="font-mono" dir="ltr">-{discountAmount.toLocaleString()} ج.م</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-[#E2E8F0]">
                      <span className="font-bold text-[#1E293B] text-xl">الإجمالي النهائي:</span>
                      <span className="font-bold text-2xl text-[#2180B2]">{finalTotal.toLocaleString()} <span className="text-base text-[#94A3B8]">ج.م</span></span>
                    </div>
                  </div>

                  {!isQuote ? (
                    <div className="pt-4 space-y-3">
                      <label className="text-sm font-bold text-[#475569]">طريقة الدفع للفاتورة:</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button type="button" onClick={() => setPaymentMethod('cash')} className={`py-2 rounded-lg font-bold text-sm border-none cursor-pointer ${paymentMethod === 'cash' ? 'bg-[#16A34A] text-white' : 'bg-[#F1F5F9] text-[#475569]'}`}>نقدي كاش</button>
                        <button type="button" onClick={() => setPaymentMethod('deferred')} className={`py-2 rounded-lg font-bold text-sm border-none cursor-pointer ${paymentMethod === 'deferred' ? 'bg-[#DC2626] text-white' : 'bg-[#F1F5F9] text-[#475569]'}`}>أجل بالكامل</button>
                        <button type="button" onClick={() => setPaymentMethod('partial')} className={`py-2 rounded-lg font-bold text-sm border-none cursor-pointer ${paymentMethod === 'partial' ? 'bg-[#D97706] text-white' : 'bg-[#F1F5F9] text-[#475569]'}`}>جزئي / عربون</button>
                      </div>

                      {paymentMethod === 'partial' && (
                        <div className="mt-2">
                          <label className="text-xs font-bold text-[#475569] block mb-1">المبلغ المدفوع (المحصل الآن)</label>
                          <input 
                             type="number" min="0" max={finalTotal} required
                             value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))}
                             className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none"
                           />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4 px-4 py-3 bg-[#FFFDF5] text-[#D97706] border border-[#FDE68A] rounded-xl text-xs font-semibold leading-relaxed">
                      💡 <strong>تنبيه عرض السعر:</strong> لن يتم خصم السلع من المخزون، ولن يتم تسجيل أي ديون أو معاملات مالية باسم العميل. هذا المستند مخصص كعرض سعر ورقي فقط.
                    </div>
                  )}

                  <div className="pt-4">
                     <button type="submit" className={`w-full py-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-md ${isQuote ? 'bg-[#D97706] hover:bg-[#B45309]' : 'bg-[#2180B2] hover:bg-[#1A6B94]'}`}>
                       <Save className="w-5 h-5" />
                       {isQuote ? (editingInvoiceId ? 'حفظ عرض السعر المعدّل' : 'إصدار عرض السعر وتأكيد') : (editingInvoiceId ? 'حفظ التعديلات' : 'إصدار الفاتورة وتأكيد')}
                     </button>
                  </div>
               </div>
            </div>

            {/* Right Column: Items */}
            <div className="lg:col-span-2 space-y-6">
               
               {/* Search Box */}
               <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-[#1E293B]">إضافة السلع بالاسم أو الباركود</h3>
                    <div className="flex gap-2">
                       <button
                         type="button"
                         onClick={() => setShowDetailsAndPrices(!showDetailsAndPrices)}
                         className={`px-3 py-1 rounded border text-sm font-bold cursor-pointer transition-colors ${showDetailsAndPrices ? 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' : 'bg-white text-[#94A3B8] border-[#E2E8F0]'}`}
                       >
                         عرض التفاصيل والأسعار ⚡
                       </button>
                       <button
                         type="button"
                         onClick={() => setAutoScannerActive(!autoScannerActive)}
                         className={`px-3 py-1 rounded border text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors ${autoScannerActive ? 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' : 'bg-white text-[#94A3B8] border-[#E2E8F0]'}`}
                       >
                         <span className={`w-2 h-2 rounded-full ${autoScannerActive ? 'bg-[#16A34A]' : 'bg-[#94A3B8]'}`}></span> القارئ الآلي نشط
                       </button>
                    </div>
                  </div>

                  <div className="flex gap-4">
                     <button
                       type="button"
                       onClick={() => searchInputRef.current?.focus()}
                       className="shrink-0 px-4 py-3 bg-[#16A34A] text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer border-none hover:bg-[#15803D] transition-colors"
                     >
                       <Barcode className="w-5 h-5" />
                       توجيه قارئ الباركود اليدوي
                     </button>
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 right-3 flex items-center pr-1 pointer-events-none text-[#94A3B8]">
                         <Search className="h-5 w-5" aria-hidden="true" />
                       </div>
                       <input
                         ref={searchInputRef}
                         type="text"
                         value={itemSearchText}
                         onChange={(e) => setItemSearchText(e.target.value)}
                         className="block w-full border border-[#E2E8F0] rounded-xl pr-12 pl-4 py-3 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none"
                         placeholder="ابحث بمسح الباركود، أدخل الرقم أو اسم القطعة..."
                       />
                       
                       {/* Search Results Dropdown */}
                       {itemSearchText && searchResults.length > 0 && (
                         <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-xl border border-[#E2E8F0] z-20 max-h-60 overflow-y-auto">
                           {searchResults.map(item => (
                             <button
                               key={item.id} type="button"
                               onClick={() => handleAddItem(item.id)}
                               className="w-full text-right px-4 py-3 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] flex justify-between items-center cursor-pointer bg-transparent"
                             >
                               <div>
                                 <p className="font-bold text-[#1E293B]">{item.name}</p>
                                 {showDetailsAndPrices && <p className="text-xs text-[#94A3B8]">كود: {item.code} | متاح: {item.quantity}</p>}
                               </div>
                               {showDetailsAndPrices && <span className="font-bold text-[#2180B2]">{item.sellPrice.toLocaleString()} ج.م</span>}
                             </button>
                           ))}
                         </div>
                       )}
                       {itemSearchText && searchResults.length === 0 && (
                         <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-xl border border-[#E2E8F0] z-20 p-4 text-center text-[#94A3B8]">
                           لا توجد نتائج مطابقة
                         </div>
                       )}
                     </div>
                  </div>
               </div>

               {/* Invoice Items List */}
               <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 min-h-[400px]">
                 <h3 className="font-bold text-lg text-[#1E293B] mb-6 border-b border-[#E2E8F0] pb-4">مكونات الفاتورة الحالية</h3>
                 
                 {invoiceItems.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-64 text-[#94A3B8]">
                     <Receipt className="w-16 h-16 mb-4 opacity-20" />
                     <p className="font-bold">الفاتورة فارغة حالياً. ابحث عن منتج بالمنشور أعلاه وأضفه.</p>
                   </div>
                 ) : (
                   <div className="overflow-x-auto">
                     <table className="w-full text-right">
                        <thead className="bg-[#F8FAFC] text-[#475569] text-sm">
                          <tr>
                            <th className="py-3 px-4 font-bold">اسم المنتج / الصنف</th>
                            {showDetailsAndPrices && <th className="py-3 px-4 font-bold w-32">السعر (ج.م)</th>}
                            <th className="py-3 px-4 font-bold w-32">الكمية</th>
                            {showDetailsAndPrices && <th className="py-3 px-4 font-bold w-32">الإجمالي (ج.م)</th>}
                            <th className="py-3 px-4 w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {invoiceItems.map((item, idx) => {
                            const invItem = getInventoryItem(item.inventoryId);
                            if (!invItem) return null;
                            const qtyTotal = item.price * item.qty;
                            return (
                              <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                                <td className="py-3 px-4">
                                  <p className="font-bold text-[#1E293B]">{invItem.name}</p>
                                  {showDetailsAndPrices && <p className="text-xs text-[#94A3B8]">كود: {invItem.code}</p>}
                                </td>
                                {showDetailsAndPrices && (
                                  <td className="py-3 px-4">
                                    <input 
                                      type="number" min="0" required
                                      value={item.price}
                                      onChange={e => {
                                        const val = Number(e.target.value);
                                        if (val >= 0) {
                                          const newItems = [...invoiceItems];
                                          newItems[idx].price = val;
                                          setInvoiceItems(newItems);
                                        }
                                      }}
                                      className="w-24 border border-[#E2E8F0] rounded-lg px-2 py-1 text-center font-bold focus:ring-2 focus:ring-[#2180B2] focus:outline-none"
                                    />
                                  </td>
                                )}
                                <td className="py-3 px-4">
                                  <input 
                                    type="number" min="1" required
                                    value={item.qty}
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      if (val > 0) {
                                        const newItems = [...invoiceItems];
                                        newItems[idx].qty = val;
                                        setInvoiceItems(newItems);
                                      }
                                    }}
                                    className="w-20 border border-[#E2E8F0] rounded-lg px-2 py-1 text-center font-bold focus:ring-2 focus:ring-[#2180B2] focus:outline-none"
                                  />
                                </td>
                                {showDetailsAndPrices && <td className="py-3 px-4 font-bold text-[#2180B2]">{qtyTotal.toLocaleString()}</td>}
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button" 
                                    onClick={() => {
                                      const newItems = [...invoiceItems];
                                      newItems.splice(idx, 1);
                                      setInvoiceItems(newItems);
                                    }}
                                    className="p-2 text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

        {/* List View */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col">
            <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:max-w-md">
                <div className="absolute inset-y-0 right-3 flex items-center pr-1 pointer-events-none text-[#94A3B8]">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full bg-[#F1F5F9] border-none rounded-lg pr-10 pl-4 py-2 text-sm focus:ring-2 focus:ring-[#2180B2] focus:outline-none"
                  placeholder="بحث برقم الفاتورة أو العميل..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-[#F7FAFC] text-xs font-bold text-[#475569] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">رقم الفاتورة</th>
                    <th className="px-6 py-4">التاريخ</th>
                    <th className="px-6 py-4">العميل</th>
                    <th className="px-6 py-4">الإجمالي (ج.م)</th>
                    <th className="px-6 py-4">المدفوع (ج.م)</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                       <td colSpan={7} className="px-6 py-8 text-center text-[#94A3B8]">لا توجد فواتير سابقة مسجلة</td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const customer = customers.find(c => c.id === inv.customerId);
                      const isFullyPaid = inv.paid >= inv.total;
                      const customerName = inv.isQuote && inv.customCustomerName ? inv.customCustomerName : (customer?.name || 'عميل نقدي');
                      return (
                        <tr key={inv.id} className="hover:bg-[#F8FAFC]">
                          <td className="px-6 py-4 font-mono font-bold text-[#2180B2]">{inv.invoiceNumber}</td>
                          <td className="px-6 py-4 text-[#475569]">{new Date(inv.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 font-bold text-[#1E293B]">
                            {customerName}
                            {inv.isQuote && <span className="mr-2 text-[10px] bg-[#FEF3C7] text-[#D97706] px-1.5 py-0.5 rounded font-bold">عرض سعر</span>}
                          </td>
                          <td className="px-6 py-4 font-bold">{inv.total.toLocaleString()}</td>
                          <td className="px-6 py-4 text-[#16A34A]">{inv.isQuote ? '---' : inv.paid.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            {inv.isQuote ? (
                              <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] whitespace-nowrap border border-[#FDE68A]">عرض سعر معتمد</span>
                            ) : (
                              <>
                                {isFullyPaid && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A] whitespace-nowrap">مدفوعة بالكامل</span>}
                                {(!isFullyPaid && inv.paid > 0) && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#FFFBEB] text-[#D97706] whitespace-nowrap">مدفوعة جزئياً</span>}
                                {inv.paid === 0 && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] whitespace-nowrap">آجل بالكامل</span>}
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4 flex items-center justify-center gap-2">
                            <button 
                              type="button"
                              onClick={() => {
                                setPrintingInvoiceId(inv.id);
                              }}
                              className="p-1.5 text-[#475569] bg-white border border-[#E2E8F0] rounded-md hover:text-[#2180B2] hover:border-[#2180B2] transition-colors cursor-pointer"
                              title="طباعة ومعاينة الفاتورة"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleEditClick(inv.id)}
                              className="p-1.5 text-[#475569] bg-white border border-[#E2E8F0] rounded-md hover:text-[#10B981] hover:border-[#10B981] transition-colors cursor-pointer"
                              title="تعديل"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(inv.id)}
                              className="p-1.5 text-[#475569] bg-white border border-[#E2E8F0] rounded-md hover:text-[#DC2626] hover:border-[#DC2626] transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {invoiceToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/50 backdrop-blur-sm p-4 print:hidden">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 relative">
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">تأكيد الحذف</h3>
              <p className="text-[#475569] mb-6">
                هل أنت متأكد من حذف هذه الفاتورة بشكل نهائي؟ سيتم استرجاع الكميات للمخزون وتعديل حساب العميل (إن وجد).
              </p>
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-4 py-2 font-bold text-[#475569] hover:bg-gray-100 rounded-lg cursor-pointer border-none bg-transparent"
                >
                  إلغاء
                </button>
                <button 
                   onClick={confirmDelete}
                  className="px-4 py-2 font-bold bg-[#DC2626] text-white hover:bg-[#B91C1C] rounded-lg cursor-pointer border-none"
                >
                  حذف نهائي
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
