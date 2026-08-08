import React, { useState, useMemo } from 'react';
import { Plus, Search, X, Factory, ArrowDownToLine, ShoppingCart, History, Edit2, Trash2, Banknote, Printer, Share2, Loader2, MessageCircle } from 'lucide-react';
import { useAppData, Supplier } from '@/src/context/AppDataContext';
import ProductSearchSelect from '../components/ProductSearchSelect';
import { captureElementToCanvas } from '../utils/canvasCapture';

export default function Suppliers() {
  const { suppliers, purchases, inventory, addSupplier, updateSupplier, deleteSupplier, createPurchase, recordSupplierPayment, businessProfile, addInventoryItem } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<{inventoryId: string; isNew: boolean; newName: string; newSellPrice: number; qty: number; cost: number;}[]>([{ inventoryId: '', isNew: false, newName: '', newSellPrice: 0, qty: 1, cost: 0 }]);
  const [paidAmount, setPaidAmount] = useState(0);

  const [selectedSupplierHistory, setSelectedSupplierHistory] = useState<Supplier | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [printingPurchase, setPrintingPurchase] = useState<any>(null);

  const [newSupplier, setNewSupplier] = useState({
    name: '', phone: '', balance: 0
  });

  const getSupplierPurchases = (supplierId: string) => {
    return purchases.filter(p => p.supplierId === supplierId);
  };

  const ledgerEntries = useMemo(() => {
    if (!selectedSupplierHistory) return [];

    const transactions = [...getSupplierPurchases(selectedSupplierHistory.id)].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let netChange = transactions.reduce((acc, inv) => acc + (inv.total - inv.paid), 0);
    const initialBalance = selectedSupplierHistory.balance - netChange;

    let currentBalance = initialBalance;
    const entries = [];

    // Formatter helper for supplier registration/creation date
    const getFormattedDate = (dateVal: any) => {
      if (!dateVal) return '-';
      try {
        if (typeof dateVal === 'object' && dateVal.seconds) {
          return new Date(dateVal.seconds * 1000).toLocaleDateString('ar-EG');
        }
        if (typeof dateVal.toDate === 'function') {
          return dateVal.toDate().toLocaleDateString('ar-EG');
        }
        return new Date(dateVal).toLocaleDateString('ar-EG');
      } catch (e) {
        return '-';
      }
    };

    if (initialBalance !== 0 || transactions.length === 0) {
      entries.push({
        id: 'initial',
        date: selectedSupplierHistory.createdAt ? getFormattedDate(selectedSupplierHistory.createdAt) : '-',
        description: 'رصيد مرحل (افتتاحي)',
        debit: initialBalance < 0 ? Math.abs(initialBalance) : 0, 
        credit: initialBalance > 0 ? initialBalance : 0,
        balance: currentBalance,
        isInitial: true
      });
    }

    transactions.forEach(inv => {
      const isPayment = inv.items.length === 0;
      const debit = inv.paid; // دفعات سددناها للمورد
      const credit = inv.total; // بضاعة وردها لنا المورد
      
      currentBalance += (credit - debit);

      let purchaseDetails = '';
      if (!isPayment && inv.items.length > 0) {
        const itemDetails = inv.items.map(item => {
          const inventoryItem = inventory.find(i => i.id === item.itemId);
          const name = inventoryItem ? inventoryItem.name : 'صنف محذوف';
          const itemPrice = item.price ?? item.unitPrice ?? 0;
          const totalItemPrice = (item.quantity * itemPrice).toLocaleString();
          return `${name} (العدد: ${item.quantity} | السعر الكلي: ${totalItemPrice} ج.م)`;
        });
        purchaseDetails = ` - أصناف: ${itemDetails.join('، ')}`;
      }

      entries.push({
        id: inv.id,
        date: new Date(inv.date).toLocaleDateString('ar-EG'),
        description: isPayment ? `سند صرف للمورد` : `توريد ونزول بضاعة${purchaseDetails}`,
        debit: debit,
        credit: credit,
        balance: currentBalance,
        isInitial: false,
        isPurchase: !isPayment,
        rawPurchase: inv
      });
    });

    return entries;
  }, [selectedSupplierHistory, purchases, inventory]);

  const handlePrintStatement = () => {
    window.print();
  };

  const handleShareWhatsApp = async () => {
    if (!selectedSupplierHistory) return;
    
    if (!selectedSupplierHistory.phone) {
      alert("المورد ليس لديه رقم هاتف مسجل للمراسلة عبر واتساب.");
      return;
    }

    try {
      setIsGeneratingImage(true);
      const element = document.getElementById('supplier-statement-printable-area');
      if (!element) return;
      
      // Temporarily change styles to capture the full scrolling content
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      const parent = element.closest('.max-h-\\[90vh\\]') as HTMLElement;
      
      let parentOriginalMaxHeight = '';
      let parentOriginalOverflow = '';

      if (parent) {
        parentOriginalMaxHeight = parent.style.maxHeight;
        parentOriginalOverflow = parent.style.overflow;
        parent.style.maxHeight = 'none';
        parent.style.overflow = 'visible';
      }

      // Restore original styles
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;

      if (parent) {
        parent.style.maxHeight = parentOriginalMaxHeight;
        parent.style.overflow = parentOriginalOverflow;
      }

      const canvas = await captureElementToCanvas(element);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsGeneratingImage(false);
          return;
        }
        
        try {
          const file = new File([blob], `statement_${selectedSupplierHistory.name}.png`, { type: 'image/png' });
          const textMsg = `مرحباً بك،\nمرفق كشف حساب تفصيلي خاص بك.`;
          
          let phone = selectedSupplierHistory.phone;
          if (phone.startsWith('0')) {
              phone = '2' + phone.substring(1);
          } else if (!phone.startsWith('2')) {
              phone = '2' + phone;
          }

          // 1. Try Native Mobile/Desktop Share First
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `كشف حساب - ${selectedSupplierHistory.name}`,
                text: textMsg
              });
              return;
            } catch (shareError: any) {
              if (shareError.name !== "AbortError") {
                console.log('Share failed', shareError);
              } else {
                return;
              }
            }
          }

          // 2. Fallback: Try to use Clipboard for Desktop Computers
          let isCopied = false;
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            isCopied = true;
          } catch (clipboardError) {
            console.log('Clipboard write failed', clipboardError);
          }

          if (isCopied) {
            alert('تم نسخ صورة الكشف بنجاح! 📋\n\n- سيتم فتح محادثة الواتساب الآن.\n- الرجاء عمل "لصق" (Paste) لإرسال الصورة مباشرةً للمورد.\n- اختصار اللصق (Ctrl+V) أو (Cmd+V).');
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textMsg)}`, '_blank');
          } else {
            // 3. Ultimate Fallback: Download file and open WA
            alert('تم تصدير وتحميل صورة الكشف 📥\n\n- سيتم فتح محادثة الواتساب الآن.\n- الرجاء إرفاق الصورة التي تم تحميلها للتو داخل المحادثة.');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `كشف_حساب_مورد_${selectedSupplierHistory.name}.png`;
            a.click();
            URL.revokeObjectURL(url);
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textMsg)}`, '_blank');
          }
        } catch (error) {
          console.error("Error sharing:", error);
        } finally {
          setIsGeneratingImage(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error(err);
      setIsGeneratingImage(false);
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => 
      s.name.includes(searchTerm) || 
      s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      updateSupplier(editingSupplier.id, newSupplier);
    } else {
      addSupplier(newSupplier);
    }
    closeSupplierModal();
  };

  const closeSupplierModal = () => {
    setIsAddSupplierModalOpen(false);
    setEditingSupplier(null);
    setNewSupplier({ name: '', phone: '', balance: 0 });
  };

  const openEditSupplierModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setNewSupplier({ name: supplier.name, phone: supplier.phone, balance: supplier.balance });
    setIsAddSupplierModalOpen(true);
  };

  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeletingSupplier, setIsDeletingSupplier] = useState(false);

  const handleDeleteSupplier = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
  };

  const handleConfirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setIsDeletingSupplier(true);
    try {
      await deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حذف المورد: ' + (err?.message || String(err)));
    } finally {
      setIsDeletingSupplier(false);
    }
  };

  const handlePaymentSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentSupplier && paymentAmount) {
      recordSupplierPayment(paymentSupplier.id, Number(paymentAmount));
      setPaymentSupplier(null);
      setPaymentAmount('');
    }
  };

  const getWhatsAppText = (purchase: any) => {
    try {
      const s = suppliers.find(su => su.id === purchase.supplierId);
      let text = `مرحباً ${s?.name || ''}،\n\n`;
      text += `تفاصيل فاتورة المشتريات رقم #${(purchase.id || '').slice(-6).toUpperCase()}\n`;
      text += `التاريخ: ${new Date(purchase.date || new Date()).toLocaleDateString('ar-EG')}\n\n`;
      
      text += `*الأصناف:*\n`;
      (purchase.items || []).forEach((item: any, idx: number) => {
        const invItem = inventory.find(i => i.id === item.itemId);
        const qty = item.quantity || 0;
        const price = item.price ?? item.unitPrice ?? 0;
        text += `${idx + 1}- ${invItem ? invItem.name : 'صنف محذوف'} | ${qty} x ${price.toLocaleString()} = ${(qty * price).toLocaleString()} ج.م\n`;
      });
      
      const total = purchase.total || 0;
      const paid = purchase.paid || 0;
      
      text += `\n*الإجمالي النهائي:* ${total.toLocaleString()} ج.م\n`;
      text += `*المدفوع:* ${paid.toLocaleString()} ج.م\n`;
      
      if (total - paid > 0) {
        text += `*المتبقي:* ${(total - paid).toLocaleString()} ج.م\n`;
      }
      text += `\nشكراً لك! - ${businessProfile?.name || 'الشركة'}`;

      return text;
    } catch (error) {
      console.error(error);
      return '';
    }
  };

  const handleSharePurchaseWhatsApp = async () => {
    if (!printingPurchase) return;
    const s = suppliers.find(su => su.id === printingPurchase.supplierId);
    if (!s?.phone) {
      alert("المورد ليس لديه رقم هاتف مسجل للمراسلة عبر واتساب.");
      return;
    }

    // 1. Open popup immediately to preserve user gesture
    let waWindow = (window as any)._waWindow;
    if (!waWindow) {
        waWindow = window.open('about:blank', '_blank');
        if (waWindow) {
          waWindow.document.write('<html dir="rtl"><body style="font-family: system-ui; text-align: center; padding-top: 50px;"><h3>جاري تجهيز الفاتورة كصورة لفتح واتساب...</h3><p>برجاء الانتظار لثواني معدودة</p></body></html>');
        }
    }
    (window as any)._waWindow = null;

    try {
      setIsGeneratingImage(true);
      const element = document.getElementById('purchase-invoice-printable-area');
      if (!element) return;
      
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      const parent = element.closest('.max-h-\\[90vh\\]') as HTMLElement;
      
      let parentOriginalMaxHeight = '';
      let parentOriginalOverflow = '';

      if (parent) {
        parentOriginalMaxHeight = parent.style.maxHeight;
        parentOriginalOverflow = parent.style.overflow;
        parent.style.maxHeight = 'none';
        parent.style.overflow = 'visible';
      }

      if (parent) {
        parent.style.maxHeight = parentOriginalMaxHeight;
        parent.style.overflow = parentOriginalOverflow;
      }

      const canvas = await captureElementToCanvas(element);
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          if (waWindow) waWindow.close();
          setIsGeneratingImage(false);
          return;
        }
        
        try {
          const textMsg = `مرفق تفاصيل فاتورة المشتريات رقم ${printingPurchase.id.slice(-6)}.`;
          const waUrl = `https://wa.me/20${s.phone.replace(/^0+/, '')}?text=${encodeURIComponent(textMsg)}`;
          
          let copied = false;
          if (navigator.clipboard && window.ClipboardItem) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              copied = true;
            } catch (err) {
              console.log('Clipboard write failed, falling back to download');
            }
          }
          
          // Always download fallback
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `purchase_invoice_${printingPurchase.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 100);
          
          if (waWindow) {
            waWindow.location.href = waUrl;
          } else {
            window.open(waUrl, '_blank');
          }

          // Alert after everything is triggered
          if (copied) {
              alert('تم نسخ الفاتورة كصورة وتحميلها 📥\n\n- سيتم فتح الواتساب الآن.\n- يمكنك عمل "لصق" (Paste) لإرسال الصورة للمورد مباشرةً.');
          } else {
              alert('تم تحميل الفاتورة كصورة 📥\n\n- سيتم فتح الواتساب الآن.\n- يمكنك إرفاق الصورة المحملة داخل المحادثة للمورد.');
          }
        } catch (err) {
          console.error(err);
          if (waWindow) waWindow.close();
        } finally {
          setIsGeneratingImage(false);
        }
        
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error generating or sharing image:', error);
      if (waWindow) waWindow.close();
      setIsGeneratingImage(false);
      alert('حدث خطأ أثناء محاولة المشاركة عبر واتساب.');
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const validItems = purchaseItems.filter(i => 
      ((!i.isNew && i.inventoryId !== '') || (i.isNew && i.newName.trim() !== '' && i.newSellPrice > 0)) && 
      i.qty > 0 && i.cost > 0
    );

    if (!selectedSupplierId || validItems.length === 0) return;

    let total = 0;
    const finalItems = [];

    for (const item of validItems) {
      const lineCost = item.qty * item.cost;
      total += lineCost;
      
      let finalItemId = item.inventoryId;
      if (item.isNew) {
        finalItemId = await addInventoryItem({
          code: `NEW-${Math.floor(Math.random() * 10000)}`,
          name: item.newName,
          brand: '',
          compatibleCars: '',
          category: 'عام',
          storageLocation: '',
          quantity: 0,
          purchasePrice: item.cost,
          sellPrice: item.newSellPrice
        });
      }
      
      finalItems.push({ itemId: finalItemId, quantity: item.qty, price: item.cost });
    }

    await createPurchase({
      date: new Date().toISOString(),
      supplierId: selectedSupplierId,
      items: finalItems,
      total,
      paid: paidAmount
    });

    setIsPurchaseModalOpen(false);
    setPurchaseItems([{ inventoryId: '', isNew: false, newName: '', newSellPrice: 0, qty: 1, cost: 0 }]);
    setSelectedSupplierId('');
    setPaidAmount(0);
  };

  return (
    <>
    <div className={`space-y-6 ${selectedSupplierHistory ? 'print:hidden' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1E293B]">حسابات الموردين والمشتريات</h2>
          <p className="mt-1 text-sm text-[#475569]">إدارة بيانات الموردين وتسجيل عمليات الشراء التي تُسمِّع في المخزن فوراً</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPurchaseModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#10B981] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#059669] cursor-pointer"
          >
            <ShoppingCart className="h-4 w-4" />
            شراء أصناف وتوريد
          </button>
          <button 
            onClick={() => {
              setEditingSupplier(null);
              setNewSupplier({ name: '', phone: '', balance: 0 });
              setIsAddSupplierModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            مورد جديد
          </button>
        </div>
      </div>

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
              className="block w-full bg-[#F1F5F9] border-none rounded-lg pr-10 pl-4 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none"
              placeholder="بحث باسم المورد..."
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-[#F7FAFC] text-xs font-bold text-[#475569] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">اسم المورد</th>
                <th className="px-6 py-4">رقم الهاتف</th>
                <th className="px-6 py-4">الرصيد المستحق (ج.م)</th>
                <th className="px-6 py-4">حالة الحساب</th>
                <th className="px-6 py-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-sm">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#94A3B8]">
                    لا يوجد موردين مطابقين للبحث
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-6 py-4 font-bold text-[#1E293B]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#475569]">
                          <Factory className="w-4 h-4" />
                        </div>
                        {supplier.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-[#475569]">{supplier.phone}</td>
                    <td className="px-6 py-4 font-bold" dir="ltr">
                      <span className={supplier.balance > 0 ? 'text-[#DC2626]' : supplier.balance < 0 ? 'text-[#16A34A]' : 'text-[#1E293B]'}>
                        {Math.abs(supplier.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {supplier.balance > 0 && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#FEF2F2] text-[#DC2626] whitespace-nowrap">مطلوب تسديده للمورد</span>}
                      {supplier.balance < 0 && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#F0FDF4] text-[#16A34A] whitespace-nowrap">الورشة دائنة للمورد</span>}
                      {supplier.balance === 0 && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] whitespace-nowrap">خالص</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => setSelectedSupplierHistory(supplier)}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#F1F5F9] text-[#475569] rounded-lg font-bold text-xs hover:bg-[#E2E8F0] transition-colors border-none cursor-pointer"
                        >
                          <History className="w-4 h-4" />
                          السجل
                        </button>
                        {supplier.phone && (
                          <a
                            href={`https://wa.me/2${supplier.phone.startsWith('0') ? supplier.phone.substring(1) : supplier.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-8 h-8 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] rounded-lg hover:bg-[#CEEAD6] transition-colors cursor-pointer"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        {supplier.balance > 0 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentSupplier(supplier);
                              setPaymentAmount(supplier.balance);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-[#EFF6FF] text-[#2563EB] rounded-lg font-bold text-xs hover:bg-[#DBEAFE] transition-colors border-none cursor-pointer"
                          >
                            <Banknote className="w-4 h-4" />
                            سداد 
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditSupplierModal(supplier);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-white border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#F1F5F9] hover:text-[#2563EB] transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSupplier(supplier);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 bg-white border border-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#FEE2E2] hover:text-[#DC2626] hover:border-[#FECACA] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supplier Record Modal */}
      {selectedSupplierHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:items-start print:block print:relative print:z-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:rounded-none">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] print:hidden">
              <h3 className="font-bold text-lg text-[#1E293B] flex items-center gap-2">
                <History className="w-5 h-5 text-[#2563EB]" />
                سجل المشتريات المتبادلة
              </h3>
              <div className="flex items-center gap-3">
                 <button 
                   onClick={handleShareWhatsApp} 
                   disabled={isGeneratingImage || !selectedSupplierHistory.phone}
                   className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-lg font-bold text-xs hover:bg-[#15803D] transition-colors border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                    {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    مشاركة {selectedSupplierHistory.phone ? 'واتساب' : '(لا يوجد رقم)'}
                 </button>
                 <button onClick={handlePrintStatement} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg font-bold text-xs hover:bg-[#1D4ED8] transition-colors border-none cursor-pointer">
                    <Printer className="w-4 h-4" />
                    طباعة
                 </button>
                 <button onClick={() => setSelectedSupplierHistory(null)} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer bg-transparent border-none">
                   <X className="w-6 h-6" />
                 </button>
              </div>
            </div>
            
            <div id="supplier-statement-printable-area" className="p-6 overflow-y-auto space-y-6 print:overflow-visible print:p-2 bg-white">
              <div className="mb-8 pt-4 border-b-2 border-[#E2E8F0] pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {businessProfile?.logo && (
                      <img src={businessProfile.logo} alt="Logo" className="w-16 h-16 object-contain" />
                    )}
                    <div>
                      <h1 className="text-2xl font-bold text-[#1E293B]">{businessProfile?.name || 'اسم الشركة'}</h1>
                      <p className="text-sm font-bold text-[#475569] mt-1" dir="ltr">{businessProfile?.phone || 'رقم التليفون'}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <h2 className="text-3xl font-bold text-[#1E293B] mb-2">كشف حساب مورد</h2>
                    <div className="text-sm font-bold text-[#475569]">
                      <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center bg-[#F1F5F9] p-4 rounded-xl border border-[#E2E8F0] gap-4 print:bg-transparent print:border-none print:p-0 print:items-end print:mb-6">
                <div className="flex items-center gap-4 text-right print:gap-2">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#2563EB] shadow-sm print:hidden flex-shrink-0 min-w-[48px]" dir="ltr">
                    <Factory className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E293B] text-lg print:text-xl">اسم المورد: {selectedSupplierHistory.name}</h3>
                    <p className="text-sm text-[#64748B] font-mono mt-1 print:text-[#1E293B]">تليفون: {selectedSupplierHistory.phone}</p>
                  </div>
                </div>
                <div className="text-left bg-white px-5 py-3 rounded-xl shadow-sm border border-[#E2E8F0] w-full sm:w-auto print:shadow-none print:px-4">
                  <p className="text-xs text-[#475569] font-bold mb-1 block">الرصيد الحالي</p>
                  <p className={`text-2xl font-bold ${selectedSupplierHistory.balance > 0 ? 'text-[#DC2626]' : selectedSupplierHistory.balance < 0 ? 'text-[#16A34A]' : 'text-[#1E293B]'} print:text-black`} dir="ltr">
                    {Math.abs(selectedSupplierHistory.balance).toLocaleString()} <span className="text-xs text-[#94A3B8] print:text-black">ج.م</span>
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-1 text-center font-bold print:text-black">
                    {selectedSupplierHistory.balance > 0 ? 'مطلوب تسديده للمورد' : selectedSupplierHistory.balance < 0 ? 'رصيد دائن للمورد' : 'حساب خالص غير مدين'}
                  </p>
                </div>
              </div>

              <div>
                <table className="w-full text-right border-collapse border border-[#E2E8F0]">
                  <thead className="bg-[#F8FAFC]">
                    <tr>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm print:text-black">التاريخ</th>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm md:w-1/3 print:text-black">البيان</th>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm text-center print:text-black">حركة دائنة (للمورد)</th>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm text-center print:text-black">حركة مدينة (سداد)</th>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm text-center print:text-black">الرصيد (ج.م)</th>
                      <th className="px-3 py-3 border border-[#E2E8F0] font-bold text-[#475569] text-sm text-center print:hidden">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.length > 0 ? (
                      ledgerEntries.map((row: any, idx) => (
                        <tr key={`${row.id}-${idx}`} className={row.isInitial ? 'bg-[#F1F5F9] print:bg-gray-100' : ''}>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-[#64748B] whitespace-nowrap print:text-black">{row.date}</td>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-[#1E293B] font-bold print:text-black">{row.description}</td>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-center text-[#DC2626] font-bold print:text-black" dir="ltr">
                            {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-center text-[#16A34A] font-bold print:text-black" dir="ltr">
                            {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-center font-bold print:text-black" dir="ltr">
                            <span className={row.balance > 0 ? 'text-[#DC2626] print:text-black' : row.balance < 0 ? 'text-[#16A34A] print:text-black' : 'text-[#64748B] print:text-black'}>
                              {Math.abs(row.balance).toLocaleString()} {row.balance > 0 ? 'دائن' : row.balance < 0 ? 'مدين' : ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 border border-[#E2E8F0] text-sm text-center print:hidden">
                            {row.isPurchase && row.rawPurchase && (
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  const s = suppliers.find(su => su.id === row.rawPurchase.supplierId);
                                  if (!s?.phone) {
                                    alert("المورد ليس لديه رقم هاتف مسجل للمراسلة عبر واتساب.");
                                    return;
                                  }
                                  
                                  let phone = s.phone;
                                  if (phone.startsWith('0')) {
                                    phone = '2' + phone.substring(1);
                                  } else if (!phone.startsWith('2')) {
                                    phone = '2' + phone;
                                  }
                                  const textMsg = `مرحباً،\nمرفق تفاصيل فاتورة المشتريات رقم: ${row.rawPurchase.id.slice(-6).toUpperCase()}\nبتاريخ: ${new Date(row.rawPurchase.date).toLocaleDateString('ar-EG')}\nالإجمالي: ${row.rawPurchase.total.toLocaleString()} ج.م\nالمدفوع: ${row.rawPurchase.paid.toLocaleString()} ج.م\nالمتبقي: ${(row.rawPurchase.total - row.rawPurchase.paid).toLocaleString()} ج.م`;
                                  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textMsg)}`, '_blank');
                                }}
                                className="inline-block text-[#16A34A] hover:text-[#15803D] transition-colors p-1 cursor-pointer bg-transparent border-none"
                                title="مشاركة الفاتورة عبر واتساب"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"/><path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1Z"/><path d="M9.5 13.5c.5 1 1.5 1 2.5 1s2-.5 2.5-1"/></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-[#94A3B8] font-bold print:text-black">لا توجد حركات مسجلة للمورد</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end print:hidden">
               <button onClick={() => setSelectedSupplierHistory(null)} className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer">
                 إغلاق النافذة
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#1E293B]">{editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}</h3>
              <button onClick={closeSupplierModal} className="text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#475569]">اسم المورد المعتمد</label>
                <input required type="text" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#475569]">رقم هاتف المورد (اختياري)</label>
                <input type="tel" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" dir="ltr" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#475569]">الرصيد الافتتاحي (ج.م)</label>
                <input type="number" value={newSupplier.balance} onChange={e => setNewSupplier({...newSupplier, balance: Number(e.target.value)})} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#2563EB] focus:outline-none" />
                <p className="text-[10px] text-[#94A3B8]">الموجب يعني أن للمورد مستحقات لديك سابقة.</p>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-[#E2E8F0] mt-6">
                <button type="button" onClick={closeSupplierModal} className="px-4 py-2 text-sm font-bold text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] cursor-pointer">إلغاء</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] cursor-pointer">{editingSupplier ? 'تحديث البيانات' : 'حفظ المورد'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Modal (Supplies directly to inventory) */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2 text-[#1E293B]">
                <ShoppingCart className="w-5 h-5 text-[#10B981]" />
                <h3 className="text-lg font-bold">تسجيل عملية شراء بضاعة</h3>
              </div>
              <button onClick={() => setIsPurchaseModalOpen(false)} className="text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreatePurchase} className="p-6 overflow-y-auto space-y-6">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#475569]">المورد</label>
                <select required value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white">
                  <option value="">-- اختر المورد --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>)}
                </select>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#1E293B] mb-3">تفاصيل البضاعة الواردة (تُضاف للمخزون فوراً)</h4>
                <div className="space-y-3">
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0]">
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#64748B]">الصنف #{idx + 1}</span>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#2563EB]">
                              <input type="checkbox" checked={item.isNew} onChange={(e) => {
                                const newItems = [...purchaseItems];
                                newItems[idx].isNew = e.target.checked;
                                setPurchaseItems(newItems);
                              }} />
                              صنف جديد (إضافة للمخزن)
                            </label>
                            {purchaseItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
                                }}
                                className="text-[#94A3B8] hover:text-[#DC2626] p-1 rounded hover:bg-[#FEE2E2] transition-colors"
                                title="حذف الصنف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                       </div>
                       
                       {item.isNew ? (
                         <div className="flex flex-col gap-2">
                           <input 
                             type="text" placeholder="اسم الصنف الجديد" required
                             value={item.newName}
                             onChange={(e) => {
                                const newItems = [...purchaseItems];
                                newItems[idx].newName = e.target.value;
                                setPurchaseItems(newItems);
                             }}
                             className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                           />
                           <input 
                             type="number" min="0" placeholder="سعر البيع للجمهور" required
                             value={item.newSellPrice || ''}
                             onChange={(e) => {
                                const newItems = [...purchaseItems];
                                newItems[idx].newSellPrice = Number(e.target.value);
                                setPurchaseItems(newItems);
                             }}
                             className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                           />
                         </div>
                       ) : (
                         <ProductSearchSelect
                           inventory={inventory}
                           value={item.inventoryId}
                           required
                           onChange={(selected) => {
                             const newItems = [...purchaseItems];
                             newItems[idx].inventoryId = selected ? selected.id : '';
                             if (selected && (!newItems[idx].cost || newItems[idx].cost === 0)) {
                               newItems[idx].cost = selected.purchasePrice || 0;
                             }
                             setPurchaseItems(newItems);
                           }}
                           placeholder="ابحث عن صنف بالاسم أو الكود أو الماركة..."
                         />
                       )}
                       
                       <div className="flex gap-2">
                         <div className="flex-1">
                           <label className="text-[10px] text-[#64748B] block mb-1">الكمية الواردة</label>
                           <input 
                             type="number" min="1" placeholder="الكمية" required
                             value={item.qty || ''}
                             onChange={(e) => {
                                const newItems = [...purchaseItems];
                                newItems[idx].qty = Number(e.target.value);
                                setPurchaseItems(newItems);
                             }}
                             className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                           />
                         </div>
                         <div className="flex-1">
                           <label className="text-[10px] text-[#64748B] block mb-1">تكلفة الشراء للقطعة</label>
                           <input 
                             type="number" min="0" placeholder="التكلفة" required
                             value={item.cost || ''}
                             onChange={(e) => {
                                const newItems = [...purchaseItems];
                                newItems[idx].cost = Number(e.target.value);
                                setPurchaseItems(newItems);
                             }}
                             className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                           />
                         </div>
                       </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPurchaseItems([...purchaseItems, { inventoryId: '', isNew: false, newName: '', newSellPrice: 0, qty: 1, cost: 0 }])} className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer">
                    + إضافة صنف آخر
                  </button>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-lg border border-[#E2E8F0]">
                <div className="flex items-center justify-between font-bold text-[#1E293B] text-lg">
                  <span>إجمالي التكلفة:</span>
                  <span>{purchaseItems.reduce((sum, item) => sum + (item.qty * item.cost), 0).toLocaleString()} <span className="text-sm">ج.م</span></span>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                   <label className="text-xs font-bold text-[#475569] block mb-1">المبلغ المدفوع كاش للمورد (ج.م)</label>
                   <input 
                     type="number" min="0" required
                     value={paidAmount} onChange={e => setPaidAmount(Number(e.target.value))}
                     className="w-full md:w-1/2 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none"
                   />
                   <p className="text-[10px] text-[#94A3B8] mt-1">الباقي سيُضاف تلقائياً إلى مديونية المورد في حساباته.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsPurchaseModalOpen(false)} className="px-6 py-2 text-sm font-bold text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] cursor-pointer">إلغاء</button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-[#10B981] rounded-lg hover:bg-[#059669] cursor-pointer">تأكيد الإدخال للمخزن</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Payment Modal */}
      {paymentSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
              <h3 className="font-bold text-lg text-[#1E293B] flex items-center gap-2">
                <Banknote className="w-5 h-5 text-[#2563EB]" />
                سداد دفعة نقدية للمورد
              </h3>
              <button onClick={() => setPaymentSupplier(null)} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer border-none bg-transparent">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSupplier} className="p-5 space-y-4">
              <div className="bg-[#EFF6FF] p-3 rounded-lg border border-[#BFDBFE]">
                <p className="text-xs text-[#1D4ED8] font-bold mb-1">المورد: {paymentSupplier.name}</p>
                <p className="text-sm text-[#1E3A8A] font-bold">المطلوب سداده: <span className="text-xl inline-block mr-1">{paymentSupplier.balance.toLocaleString()}</span> ج.م</p>
              </div>

              <div className="space-y-1 mt-4">
                <label className="text-sm font-bold text-[#475569]">المبلغ المسدد نقداً (ج.م)</label>
                <div className="relative">
                  <input 
                    required 
                    type="number" 
                    min="1"
                    max={paymentSupplier.balance}
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(Number(e.target.value))} 
                    className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-lg font-bold flex-1 text-left focus:ring-2 focus:ring-[#2563EB] focus:outline-none" 
                    dir="ltr"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold pointer-events-none">ج.م</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setPaymentSupplier(null)} className="px-4 py-2.5 text-sm font-bold text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] cursor-pointer">
                  إلغاء
                </button>
                <button type="submit" className="px-6 py-2.5 text-sm font-bold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] cursor-pointer shadow-sm">
                  تأكيد السداد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printing Purchase Invoice Modal */}
      {printingPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/50 backdrop-blur-sm p-4 print:p-0 print:bg-white print:items-start print:block print:relative print:z-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:h-auto print:shadow-none print:rounded-none">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC] print:hidden">
              <h3 className="font-bold text-lg text-[#1E293B] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#2563EB]" />
                طباعة فاتورة المشتريات
              </h3>
              <div className="flex items-center gap-3">
                 <button 
                    id="share-whatsapp-btn"
                    onClick={handleSharePurchaseWhatsApp}
                    disabled={isGeneratingImage}
                    className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-lg font-bold hover:bg-[#15803D] transition-colors cursor-pointer border-none shadow-sm test-sm disabled:opacity-70"
                 >
                   {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                   مشاركة واتساب
                 </button>
                 <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg font-bold hover:bg-[#1D4ED8] transition-colors cursor-pointer border-none shadow-sm test-sm">
                   <Printer className="w-4 h-4" /> الطباعة الآن
                 </button>
                 <button onClick={() => setPrintingPurchase(null)} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer bg-transparent border-none">
                   <X className="w-6 h-6" />
                 </button>
              </div>
            </div>
            
            <div id="purchase-invoice-printable-area" className="p-8 overflow-y-auto space-y-8 print:overflow-visible print:px-4 print:py-8 bg-white relative">
              <div className="mb-8 border-b-2 border-[#E2E8F0] pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {businessProfile?.logo && (
                      <img src={businessProfile.logo} alt="Logo" className="w-16 h-16 object-contain" />
                    )}
                    <div>
                      <h1 className="text-3xl font-bold text-[#1E293B]">{businessProfile?.name || 'اسم الشركة'}</h1>
                      <p className="text-sm font-bold text-[#475569] mt-2" dir="ltr">{businessProfile?.phone}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <h2 className="text-4xl font-bold text-[#2563EB] mb-2 uppercase">فاتورة مشتريات</h2>
                    <p className="text-sm font-bold text-[#475569]">
                      رقم الفاتورة: <span className="text-[#1E293B] font-mono">#{printingPurchase.id.slice(-6).toUpperCase()}</span>
                    </p>
                    <p className="text-sm font-bold text-[#475569] mt-1">
                      التاريخ: <span className="text-[#1E293B] font-mono">{new Date(printingPurchase.date).toLocaleDateString('ar-EG')}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] print:border-none print:px-0">
                <h3 className="text-sm font-bold text-[#94A3B8] mb-1">بيانات المورد</h3>
                {(() => {
                  const s = suppliers.find(su => su.id === printingPurchase.supplierId);
                  return (
                    <div>
                      <p className="font-bold text-lg text-[#1E293B]">{s?.name || 'غير متوفر'}</p>
                      <p className="text-sm font-bold text-[#64748B] mt-1 font-mono">تليفون: {s?.phone || '-'}</p>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-8">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-[#F1F5F9] border-y-2 border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-4 text-sm font-bold text-[#475569] print:text-black">م</th>
                      <th className="py-3 px-4 text-sm font-bold text-[#475569] print:text-black">اسم الصنف والتفاصيل</th>
                      <th className="py-3 px-4 text-sm font-bold text-[#475569] text-center print:text-black">الكمية</th>
                      <th className="py-3 px-4 text-sm font-bold text-[#475569] text-center print:text-black">تكلفة الوحدة</th>
                      <th className="py-3 px-4 text-sm font-bold text-[#475569] text-left print:text-black">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {printingPurchase.items.map((item: any, idx: number) => {
                      const invItem = inventory.find(i => i.id === item.itemId);
                      const unitPrice = item.price ?? item.unitPrice ?? 0;
                      return (
                        <tr key={idx}>
                          <td className="py-4 px-4 text-sm text-[#64748B] font-bold print:text-black">{idx + 1}</td>
                          <td className="py-4 px-4 print:text-black">
                            <span className="font-bold text-[#1E293B] block">{invItem ? invItem.name : 'صنف محذوف'}</span>
                            {invItem && <span className="text-xs text-[#94A3B8] mt-1 font-mono">{invItem.code}</span>}
                          </td>
                          <td className="py-4 px-4 text-sm text-center font-bold text-[#475569] print:text-black" dir="ltr">{item.quantity}</td>
                          <td className="py-4 px-4 text-sm text-center font-bold text-[#475569] print:text-black" dir="ltr">{unitPrice.toLocaleString()}</td>
                          <td className="py-4 px-4 text-sm font-bold text-[#1E293B] text-left print:text-black" dir="ltr">{(item.quantity * unitPrice).toLocaleString()} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-8 flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold text-[#475569] print:text-black">الإجمالي النهائي:</span>
                    <span className="font-bold text-2xl text-[#1E293B] print:text-black" dir="ltr">{printingPurchase.total.toLocaleString()} <span className="text-sm">ج.م</span></span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-3 border-t border-[#E2E8F0] print:border-black/20">
                    <span className="font-bold text-[#16A34A] print:text-black">المبلغ المدفوع:</span>
                    <span className="font-bold text-[#16A34A] print:text-black" dir="ltr">{printingPurchase.paid.toLocaleString()} ج.م</span>
                  </div>
                  {printingPurchase.total - printingPurchase.paid > 0 && (
                     <div className="flex justify-between items-center text-sm pt-3">
                       <span className="font-bold text-[#DC2626] print:text-black">المبلغ المتبقي للآجل:</span>
                       <span className="font-bold text-[#DC2626] print:text-black" dir="ltr">{(printingPurchase.total - printingPurchase.paid).toLocaleString()} ج.م</span>
                     </div>
                  )}
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-[#E2E8F0] flex justify-between text-xs font-bold text-[#94A3B8] print:text-black/50">
                <p>توقيع المستلم: ...............................</p>
                <p>توقيع المورد: ...............................</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-end print:hidden">
               <button onClick={() => setPrintingPurchase(null)} className="px-6 py-2.5 bg-white border border-[#E2E8F0] text-[#1E293B] rounded-xl font-bold hover:bg-[#F1F5F9] transition-colors cursor-pointer">
                 إغلاق النافذة
               </button>
            </div>
          </div>
        </div>
      )}

      {supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A2332]/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#FFF1F2]">
              <h3 className="text-lg font-bold text-[#991B1B] flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-[#DC2626]" />
                مراجعة وتأكيد الحذف
              </h3>
              <button 
                type="button"
                onClick={() => setSupplierToDelete(null)}
                className="text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer bg-transparent border-none outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-right space-y-2">
                <p className="text-sm font-bold text-[#1E293B]">
                  هل أنت متأكد تماماً من رغبتك في حذف المورد <span className="text-[#DC2626] font-extrabold">{supplierToDelete.name}</span>؟
                </p>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  تنبيه: سيؤدي الحذف إلى إزالة سجل المورد نهائياً من الورشة وقاعدة البيانات. لن تتمكن من التراجع عن هذه الخطوة.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#E2E8F0]">
                <button 
                  type="button" 
                  onClick={() => setSupplierToDelete(null)} 
                  disabled={isDeletingSupplier}
                  className="px-4 py-2 text-sm font-bold text-[#475569] bg-[#F1F5F9] rounded-lg hover:bg-[#E2E8F0] cursor-pointer disabled:opacity-50"
                >
                  إلغاء التراجع
                </button>
                <button 
                  type="button" 
                  onClick={handleConfirmDeleteSupplier}
                  disabled={isDeletingSupplier}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isDeletingSupplier && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isDeletingSupplier ? 'جاري الحذف...' : 'نعم، تأكيد الحذف 🗑️'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
