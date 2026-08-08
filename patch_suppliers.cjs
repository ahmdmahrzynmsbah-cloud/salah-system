const fs = require('fs');
let code = fs.readFileSync('src/pages/Suppliers.tsx', 'utf8');

// 1. Add addInventoryItem to useAppData
code = code.replace(
  "const { suppliers, purchases, inventory, addSupplier, updateSupplier, deleteSupplier, createPurchase, recordSupplierPayment, businessProfile } = useAppData();",
  "const { suppliers, purchases, inventory, addSupplier, updateSupplier, deleteSupplier, createPurchase, recordSupplierPayment, businessProfile, addInventoryItem } = useAppData();"
);

// 2. Update purchaseItems state
code = code.replace(
  "const [purchaseItems, setPurchaseItems] = useState([{ inventoryId: '', qty: 1, cost: 0 }]);",
  "const [purchaseItems, setPurchaseItems] = useState<{inventoryId: string; isNew: boolean; newName: string; newSellPrice: number; qty: number; cost: number;}[]>([{ inventoryId: '', isNew: false, newName: '', newSellPrice: 0, qty: 1, cost: 0 }]);"
);

// 3. Update handleCreatePurchase
code = code.replace(/const handleCreatePurchase = \(e: React\.FormEvent\) => \{[\s\S]*?setPaidAmount\(0\);\n  \};/m, `const handleCreatePurchase = async (e: React.FormEvent) => {
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
          code: \`NEW-\${Math.floor(Math.random() * 10000)}\`,
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
  };`);

// 4. Update the UI rendering of purchaseItems
const oldUI = `{purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-[#F1F5F9] p-3 rounded-lg sm:bg-transparent sm:p-0">
                       <select 
                         required 
                         value={item.inventoryId}
                         onChange={(e) => {
                            const newItems = [...purchaseItems];
                            newItems[idx].inventoryId = e.target.value;
                            setPurchaseItems(newItems);
                         }}
                         className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                       >
                         <option value="">-- الصنف --</option>
                         {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} (متوفر: {inv.quantity})</option>)}
                       </select>
                       <div className="flex gap-2">
                         <input 
                           type="number" min="1" placeholder="الكمية" required
                           value={item.qty}
                           onChange={(e) => {
                              const newItems = [...purchaseItems];
                              newItems[idx].qty = Number(e.target.value);
                              setPurchaseItems(newItems);
                           }}
                           className="w-full sm:w-24 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                         />
                         <input 
                           type="number" min="0" placeholder="تكلفة الوحدة" required
                           value={item.cost}
                           onChange={(e) => {
                              const newItems = [...purchaseItems];
                              newItems[idx].cost = Number(e.target.value);
                              setPurchaseItems(newItems);
                           }}
                           className="w-full sm:w-32 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                         />
                       </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setPurchaseItems([...purchaseItems, { inventoryId: '', qty: 1, cost: 0 }])} className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer">
                    + إضافة صنف آخر
                  </button>`;

const newUI = `{purchaseItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0]">
                       <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-[#64748B]">الصنف #{idx + 1}</span>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#2563EB]">
                            <input type="checkbox" checked={item.isNew} onChange={(e) => {
                              const newItems = [...purchaseItems];
                              newItems[idx].isNew = e.target.checked;
                              setPurchaseItems(newItems);
                            }} />
                            صنف جديد (إضافة للمخزن)
                          </label>
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
                         <select 
                           required 
                           value={item.inventoryId}
                           onChange={(e) => {
                              const newItems = [...purchaseItems];
                              newItems[idx].inventoryId = e.target.value;
                              setPurchaseItems(newItems);
                           }}
                           className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#10B981] focus:outline-none bg-white"
                         >
                           <option value="">-- اختر الصنف من المخزن --</option>
                           {inventory.map(inv => <option key={inv.id} value={inv.id}>{inv.name} (متوفر: {inv.quantity})</option>)}
                         </select>
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
                  </button>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync('src/pages/Suppliers.tsx', code);
console.log('Patched Suppliers.tsx');
