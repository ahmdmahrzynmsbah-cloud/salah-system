import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'main_store'
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Don't throw for now to avoid crashing the app if permissions aren't set yet
}

export type InventoryItem = {
  id: string;
  code: string;
  name: string;
  brand: string;
  compatibleCars: string;
  category: string;
  storageLocation: string;
  quantity: number;
  purchasePrice: number;
  sellPrice: number;
  createdAt?: number;
  updatedAt?: number;
};

export type Customer = {
  id: string;
  serialNumber: string;
  name: string;
  phone: string;
  balance: number;
  createdAt?: number;
  updatedAt?: number;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  createdAt?: number;
  updatedAt?: number;
};

export type TransactionItem = {
  itemId: string;
  quantity: number;
  price: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  items: TransactionItem[];
  total: number;
  paid: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  createdAt?: number;
  updatedAt?: number;
  isQuote?: boolean;
  customCustomerName?: string;
};

export type PurchaseOrder = {
  id: string;
  date: string;
  supplierId: string;
  items: TransactionItem[];
  total: number;
  paid: number;
  createdAt?: number;
  updatedAt?: number;
};

export type AppNotification = {
  id: string;
  message: string;
  date: string;
  read: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export type BusinessProfile = {
  name: string;
  phone: string;
  address: string;
  description?: string;
  logo: string | null;
  createdAt?: number;
  updatedAt?: number;
};

type Category = {
  id: string;
  name: string;
};

type AppDataContextType = {
  inventory: InventoryItem[];
  categories: string[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  purchases: PurchaseOrder[];
  notifications: AppNotification[];
  businessProfile: BusinessProfile;
  
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<string>;
  updateInventoryItem: (id: string, item: Omit<InventoryItem, 'id'>) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
  
  addCategory: (category: string) => Promise<void>;
  removeCategory: (category: string) => Promise<void>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'serialNumber'>) => Promise<void>;
  updateCustomer: (id: string, customer: Omit<Customer, 'id' | 'serialNumber'>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, supplier: Omit<Supplier, 'id'>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  
  createInvoice: (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => Promise<void>;
  updateInvoice: (id: string, invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  createPurchase: (purchase: Omit<PurchaseOrder, 'id'>) => Promise<void>;
  recordCustomerPayment: (customerId: string, amount: number) => Promise<void>;
  recordSupplierPayment: (supplierId: string, amount: number) => Promise<void>;
  
  markAllNotificationsRead: () => Promise<void>;
  updateBusinessProfile: (profile: BusinessProfile) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const uid = 'main_store';

  const [categories, setCategories] = useState<string[]>([]);
  const [categoriesDocs, setCategoriesDocs] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>({
    name: 'العمدة',
    phone: '01000000000',
    address: 'القاهرة، مصر',
    description: 'نظام العمدة لإدارة قطع غيار السيارات والمخزون والمبيعات',
    logo: null
  });

  useEffect(() => {
    const unsubs = [
      onSnapshot(doc(db, 'users', uid, 'profile', 'businessProfile'), (doc) => {
        if (doc.exists()) setBusinessProfile(doc.data() as BusinessProfile);
      }, (e) => handleFirestoreError(e, OperationType.GET, `users/${uid}/profile`)),
      onSnapshot(collection(db, 'users', uid, 'categories'), (snap) => {
        if (snap.empty && !localStorage.getItem('categories_seeded_v5')) {
          localStorage.setItem('categories_seeded_v5', 'true');
          const defaultCats = ["فلاتر", "فرامل", "كهرباء", "زيوت", "إطارات", "عادم", "تعليق", "أخرى"];
          const batch = writeBatch(db);
          defaultCats.forEach(catName => {
            const ref = doc(collection(db, 'users', uid, 'categories'));
            batch.set(ref, { ownerId: uid, name: catName, createdAt: Date.now(), updatedAt: Date.now() });
          });
          batch.commit().catch(console.error);
          setCategories(defaultCats);
        } else {
          const cats = snap.docs.map(t => ({ id: t.id, name: t.data().name }));
          
          // Deduplicate category docs and names
          const seen = new Set<string>();
          const uniqueCatsDocs: { id: string; name: string }[] = [];
          const uniqueNames: string[] = [];
          const duplicateDocIdsToDelete: string[] = [];

          for (const c of cats) {
            const rawName = (c.name || '').toString();
            const cleanName = rawName.replace(/[\s\u00A0\u200B]+/g, ' ').trim();
            const normalizedKey = cleanName.toLowerCase();
            
            if (!cleanName) {
              duplicateDocIdsToDelete.push(c.id);
              continue;
            }
            if (seen.has(normalizedKey)) {
              duplicateDocIdsToDelete.push(c.id);
            } else {
              seen.add(normalizedKey);
              uniqueCatsDocs.push({ id: c.id, name: cleanName });
              uniqueNames.push(cleanName);
            }
          }

          setCategoriesDocs(uniqueCatsDocs);
          setCategories(uniqueNames);

          if (duplicateDocIdsToDelete.length > 0) {
            const batch = writeBatch(db);
            duplicateDocIdsToDelete.forEach(dupId => {
              batch.delete(doc(db, 'users', uid, 'categories', dupId));
            });
            batch.commit().catch(console.error);
          }
        }
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/categories`)),
      onSnapshot(collection(db, 'users', uid, 'inventory'), (snap) => {
        setInventory(snap.docs.map(d => ({ ...d.data(), id: d.id } as InventoryItem)));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/inventory`)),
      onSnapshot(collection(db, 'users', uid, 'customers'), (snap) => {
        setCustomers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Customer)));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/customers`)),
      onSnapshot(collection(db, 'users', uid, 'suppliers'), (snap) => {
        setSuppliers(snap.docs.map(d => ({ ...d.data(), id: d.id } as Supplier)));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/suppliers`)),
      onSnapshot(collection(db, 'users', uid, 'invoices'), (snap) => {
        setInvoices(snap.docs.map(d => ({ ...d.data(), id: d.id } as Invoice)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/invoices`)),
      onSnapshot(collection(db, 'users', uid, 'purchases'), (snap) => {
        setPurchases(snap.docs.map(d => ({ ...d.data(), id: d.id } as PurchaseOrder)).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/purchases`)),
      onSnapshot(collection(db, 'users', uid, 'notifications'), (snap) => {
        setNotifications(snap.docs.map(d => ({ ...d.data(), id: d.id } as AppNotification)));
      }, (e) => handleFirestoreError(e, OperationType.LIST, `users/${uid}/notifications`))
    ];

    return () => unsubs.forEach(unsub => unsub());
  }, [uid]);

  const lowStockThreshold = 10;
  const currentNotifications = useMemo(() => {
    const lowStockAlerts = inventory
      .filter(i => i.quantity <= lowStockThreshold)
      .map(i => ({
        id: `low-stock-${i.id}`,
        message: `تنبيه: صنف (${i.name}) قارب على الانتهاء. المتبقي: ${i.quantity}`,
        date: new Date().toISOString(),
        read: false
      }));
    
    return [...notifications, ...lowStockAlerts];
  }, [inventory, notifications]);

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>): Promise<string> => {
    try {
      // Remove any undefined properties and replace with defaults to prevent Firebase error
      const cleanedItem = Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, v === undefined ? '' : v])
      );
      
      const newRef = doc(collection(db, 'users', uid, 'inventory'));
      await setDoc(newRef, { ...cleanedItem, ownerId: uid, createdAt: Date.now(), updatedAt: Date.now() });
      return newRef.id;
    } catch (e: any) {
      console.error('Error adding inventory item:', e);
      throw new Error(e?.message || 'فشل في حفظ المنتج في قاعدة البيانات.');
    }
  };
  
  const updateInventoryItem = async (id: string, item: Omit<InventoryItem, 'id'>) => {
    try {
      const cleanedItem = Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k, v === undefined ? '' : v])
      );
      await setDoc(doc(db, 'users', uid, 'inventory', id), { ...cleanedItem, ownerId: uid, updatedAt: Date.now() }, { merge: true });
    } catch (e: any) {
      console.error(e);
      throw new Error(e?.message || 'فشل في تعديل المنتج.');
    }
  };
  
  const deleteInventoryItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'inventory', id));
    } catch (e: any) {
      console.error('Error deleting inventory item:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/inventory/${id}`);
      throw new Error(e?.message || 'تعذر حذف الصنف من المخزن.');
    }
  };

  const addCategory = async (category: string) => {
    const cleanName = category.replace(/[\s\u00A0\u200B]+/g, ' ').trim();
    if (!cleanName) return;
    const normalizedKey = cleanName.toLowerCase();

    if (categories.some(c => c.replace(/[\s\u00A0\u200B]+/g, ' ').trim().toLowerCase() === normalizedKey)) {
      throw new Error('هذه الفئة موجودة بالفعل في القائمة.');
    }

    // Optimistic local state update
    setCategories(prev => [...prev, cleanName]);

    try {
      const newRef = doc(collection(db, 'users', uid, 'categories'));
      await setDoc(newRef, { ownerId: uid, name: cleanName, createdAt: Date.now(), updatedAt: Date.now() });
    } catch (e: any) {
      console.error('Error adding category:', e);
      // Revert optimistic state on failure
      setCategories(prev => prev.filter(c => c.replace(/[\s\u00A0\u200B]+/g, ' ').trim().toLowerCase() !== normalizedKey));
      if (e?.message === 'هذه الفئة موجودة بالفعل في القائمة.') throw e;
      handleFirestoreError(e, OperationType.CREATE, `users/${uid}/categories`);
      throw new Error(e?.message || 'تعذر إضافة الفئة.');
    }
  };
  
  const removeCategory = async (categoryName: string) => {
    const cleanTarget = categoryName.replace(/[\s\u00A0\u200B]+/g, ' ').trim();
    if (!cleanTarget) return;
    const normalizedTarget = cleanTarget.toLowerCase();

    // Optimistic local state update
    setCategories(prev => prev.filter(c => c.replace(/[\s\u00A0\u200B]+/g, ' ').trim().toLowerCase() !== normalizedTarget));
    setCategoriesDocs(prev => prev.filter(c => c.name.replace(/[\s\u00A0\u200B]+/g, ' ').trim().toLowerCase() !== normalizedTarget));

    try {
      const matchingCats = categoriesDocs.filter(c => 
        (c.name || '').toString().replace(/[\s\u00A0\u200B]+/g, ' ').trim().toLowerCase() === normalizedTarget
      );

      const batch = writeBatch(db);
      if (matchingCats.length > 0) {
        matchingCats.forEach(cat => {
          batch.delete(doc(db, 'users', uid, 'categories', cat.id));
        });
      }
      const catId = encodeURIComponent(normalizedTarget);
      batch.delete(doc(db, 'users', uid, 'categories', catId));
      await batch.commit().catch(() => {});
    } catch (e: any) {
      console.error('Error deleting category:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/categories`);
      throw new Error(e?.message || 'تعذر حذف الفئة.');
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'serialNumber'>) => {
    try {
      const serialNumber = `CUST-${1000 + customers.length + 1}`;
      const newRef = doc(collection(db, 'users', uid, 'customers'));
      await setDoc(newRef, { ...customer, ownerId: uid, serialNumber, createdAt: Date.now(), updatedAt: Date.now() });
      console.log('Customer added successfully:', newRef.id);
    } catch(e) {
      console.error('Error adding customer:', e);
      alert('Error adding customer: ' + String(e));
      throw e;
    }
  };

  const updateCustomer = async (id: string, customer: Omit<Customer, 'id' | 'serialNumber'>) => {
    await setDoc(doc(db, 'users', uid, 'customers', id), { ...customer, ownerId: uid, updatedAt: Date.now() }, { merge: true });
  };

  const deleteCustomer = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'customers', id));
    } catch (e: any) {
      console.error('Error deleting customer:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/customers/${id}`);
      throw new Error(e?.message || 'تعذر حذف العميل.');
    }
  };

  const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const newRef = doc(collection(db, 'users', uid, 'suppliers'));
    await setDoc(newRef, { ...supplier, ownerId: uid, createdAt: Date.now(), updatedAt: Date.now() });
  };

  const updateSupplier = async (id: string, supplier: Omit<Supplier, 'id'>) => {
    await setDoc(doc(db, 'users', uid, 'suppliers', id), { ...supplier, ownerId: uid, updatedAt: Date.now() }, { merge: true });
  };

  const deleteSupplier = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid, 'suppliers', id));
    } catch (e: any) {
      console.error('Error deleting supplier:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/suppliers/${id}`);
      throw new Error(e?.message || 'تعذر حذف المورد.');
    }
  };

  const createInvoice = async (invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    try {
      const isQuote = invoice.isQuote || false;
      const invoiceNumber = isQuote 
        ? `QT-${1000 + invoices.filter(i => i.isQuote).length + 1}`
        : `INV-${1000 + invoices.length + 1}`;
      const newRef = doc(collection(db, 'users', uid, 'invoices'));
      const batch = writeBatch(db);
      
      batch.set(newRef, { ...invoice, ownerId: uid, invoiceNumber, createdAt: Date.now(), updatedAt: Date.now() });
      
      if (!isQuote) {
        for (const item of invoice.items) {
          const invRef = doc(db, 'users', uid, 'inventory', item.itemId);
          const currentItem = inventory.find(i => i.id === item.itemId);
          if (currentItem) {
            batch.update(invRef, { quantity: currentItem.quantity - item.quantity, updatedAt: Date.now() });
          }
        }

        const remaining = invoice.total - invoice.paid;
        if (remaining !== 0 && invoice.customerId) {
          const custRef = doc(db, 'users', uid, 'customers', invoice.customerId);
          const currentCust = customers.find(c => c.id === invoice.customerId);
          if (currentCust) {
            batch.update(custRef, { balance: currentCust.balance + remaining, updatedAt: Date.now() });
          }
        }
      }
      
      await batch.commit();
    } catch (e: any) {
      console.error('Error creating invoice:', e);
      handleFirestoreError(e, OperationType.CREATE, `users/${uid}/invoices`);
      throw new Error(e?.message || 'تعذر إصدار الفاتورة. يرجى التحقق من اتصالك بالإنترنت وقواعد البيانات.');
    }
  };

  const updateInvoice = async (id: string, invoice: Omit<Invoice, 'id' | 'invoiceNumber'>) => {
    try {
      const existingInvoice = invoices.find(inv => inv.id === id);
      if (!existingInvoice) return;

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', uid, 'invoices', id), { ...invoice, ownerId: uid, updatedAt: Date.now() }, { merge: true });

      const wasQuote = existingInvoice.isQuote || false;
      const isQuote = invoice.isQuote || false;

      if (!wasQuote && !isQuote) {
        for (const existingItem of existingInvoice.items) {
          const invRef = doc(db, 'users', uid, 'inventory', existingItem.itemId);
          const currentItem = inventory.find(i => i.id === existingItem.itemId);
          if (currentItem) {
            const newItem = invoice.items.find(i => i.itemId === existingItem.itemId);
            let newQuantity = currentItem.quantity + existingItem.quantity;
            if (newItem) newQuantity -= newItem.quantity;
            batch.update(invRef, { quantity: newQuantity, updatedAt: Date.now() });
          }
        }
        for (const newItem of invoice.items) {
          if (!existingInvoice.items.find(i => i.itemId === newItem.itemId)) {
            const invRef = doc(db, 'users', uid, 'inventory', newItem.itemId);
            const currentItem = inventory.find(i => i.id === newItem.itemId);
            if (currentItem) {
              batch.update(invRef, { quantity: currentItem.quantity - newItem.quantity, updatedAt: Date.now() });
            }
          }
        }

        const oldRemaining = existingInvoice.total - existingInvoice.paid;
        const newRemaining = invoice.total - invoice.paid;
        
        if (existingInvoice.customerId && invoice.customerId) {
          if (existingInvoice.customerId === invoice.customerId) {
              const custRef = doc(db, 'users', uid, 'customers', existingInvoice.customerId);
              const cust = customers.find(c => c.id === existingInvoice.customerId);
              if (cust) batch.update(custRef, { balance: cust.balance - oldRemaining + newRemaining, updatedAt: Date.now() });
          } else {
              const oldCustRef = doc(db, 'users', uid, 'customers', existingInvoice.customerId);
              const oldCust = customers.find(c => c.id === existingInvoice.customerId);
              if (oldCust) batch.update(oldCustRef, { balance: oldCust.balance - oldRemaining, updatedAt: Date.now() });

              const newCustRef = doc(db, 'users', uid, 'customers', invoice.customerId);
              const newCust = customers.find(c => c.id === invoice.customerId);
              if (newCust) batch.update(newCustRef, { balance: newCust.balance + newRemaining, updatedAt: Date.now() });
          }
        } else if (invoice.customerId) {
          const newCustRef = doc(db, 'users', uid, 'customers', invoice.customerId);
          const newCust = customers.find(c => c.id === invoice.customerId);
          if (newCust) batch.update(newCustRef, { balance: newCust.balance + newRemaining, updatedAt: Date.now() });
        } else if (existingInvoice.customerId) {
          const oldCustRef = doc(db, 'users', uid, 'customers', existingInvoice.customerId);
          const oldCust = customers.find(c => c.id === existingInvoice.customerId);
          if (oldCust) batch.update(oldCustRef, { balance: oldCust.balance - oldRemaining, updatedAt: Date.now() });
        }
      } else if (!wasQuote && isQuote) {
        // Revert old standard operations
        for (const soldItem of existingInvoice.items) {
          const invRef = doc(db, 'users', uid, 'inventory', soldItem.itemId);
          const currentItem = inventory.find(i => i.id === soldItem.itemId);
          if (currentItem) {
            batch.update(invRef, { quantity: currentItem.quantity + soldItem.quantity, updatedAt: Date.now() });
          }
        }
        const remaining = existingInvoice.total - existingInvoice.paid;
        if (remaining !== 0 && existingInvoice.customerId) {
          const custRef = doc(db, 'users', uid, 'customers', existingInvoice.customerId);
          const cust = customers.find(c => c.id === existingInvoice.customerId);
          if (cust) batch.update(custRef, { balance: cust.balance - remaining, updatedAt: Date.now() });
        }
      } else if (wasQuote && !isQuote) {
        // Apply new standard invoice operations
        for (const soldItem of invoice.items) {
          const invRef = doc(db, 'users', uid, 'inventory', soldItem.itemId);
          const currentItem = inventory.find(i => i.id === soldItem.itemId);
          if (currentItem) {
            batch.update(invRef, { quantity: currentItem.quantity - soldItem.quantity, updatedAt: Date.now() });
          }
        }
        const remaining = invoice.total - invoice.paid;
        if (remaining !== 0 && invoice.customerId) {
          const custRef = doc(db, 'users', uid, 'customers', invoice.customerId);
          const cust = customers.find(c => c.id === invoice.customerId);
          if (cust) batch.update(custRef, { balance: cust.balance + remaining, updatedAt: Date.now() });
        }
      }

      await batch.commit();
    } catch (e: any) {
      console.error('Error updating invoice:', e);
      handleFirestoreError(e, OperationType.UPDATE, `users/${uid}/invoices/${id}`);
      throw new Error(e?.message || 'تعذر تعديل الفاتورة.');
    }
  };

  const deleteInvoice = async (id: string) => {
    const invToDelete = invoices.find(inv => inv.id === id);
    if (!invToDelete) return;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'users', uid, 'invoices', id));

      if (!invToDelete.isQuote) {
        for (const soldItem of invToDelete.items) {
          const invRef = doc(db, 'users', uid, 'inventory', soldItem.itemId);
          const currentItem = inventory.find(i => i.id === soldItem.itemId);
          if (currentItem) {
            batch.update(invRef, { quantity: currentItem.quantity + soldItem.quantity, updatedAt: Date.now() });
          }
        }

        const remaining = invToDelete.total - invToDelete.paid;
        if (remaining !== 0 && invToDelete.customerId) {
          const custRef = doc(db, 'users', uid, 'customers', invToDelete.customerId);
          const cust = customers.find(c => c.id === invToDelete.customerId);
          if (cust) batch.update(custRef, { balance: cust.balance - remaining, updatedAt: Date.now() });
        }
      }

      await batch.commit();
    } catch (e: any) {
      console.error('Error deleting invoice:', e);
      handleFirestoreError(e, OperationType.DELETE, `users/${uid}/invoices/${id}`);
      throw new Error(e?.message || 'تعذر حذف الفاتورة.');
    }
  };

  const createPurchase = async (purchase: Omit<PurchaseOrder, 'id'>) => {
    const newRef = doc(collection(db, 'users', uid, 'purchases'));
    const batch = writeBatch(db);
    
    batch.set(newRef, { ...purchase, ownerId: uid, createdAt: Date.now(), updatedAt: Date.now() });
    
    for (const purItem of purchase.items) {
      const invRef = doc(db, 'users', uid, 'inventory', purItem.itemId);
      const currentItem = inventory.find(i => i.id === purItem.itemId);
      if (currentItem) {
        batch.update(invRef, { quantity: currentItem.quantity + purItem.quantity, purchasePrice: purItem.price, updatedAt: Date.now() });
      }
    }

    const remaining = purchase.total - purchase.paid;
    if (remaining !== 0) {
      const supRef = doc(db, 'users', uid, 'suppliers', purchase.supplierId);
      const sup = suppliers.find(s => s.id === purchase.supplierId);
      if (sup) {
        batch.update(supRef, { balance: sup.balance + remaining, updatedAt: Date.now() });
      }
    }
    
    await batch.commit();
  };

  const recordCustomerPayment = async (customerId: string, amount: number) => {
    if (amount <= 0) return;
    const invoiceNumber = `PAY-${1000 + invoices.length + 1}`;
    const newRef = doc(collection(db, 'users', uid, 'invoices'));
    const batch = writeBatch(db);
    
    batch.set(newRef, {
      ownerId: uid,
      invoiceNumber,
      date: new Date().toISOString(),
      customerId,
      items: [],
      total: 0,
      paid: amount,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const custRef = doc(db, 'users', uid, 'customers', customerId);
    const cust = customers.find(c => c.id === customerId);
    if (cust) {
      batch.update(custRef, { balance: cust.balance - amount, updatedAt: Date.now() });
    }

    await batch.commit();
  };

  const recordSupplierPayment = async (supplierId: string, amount: number) => {
    if (amount <= 0) return;
    const newRef = doc(collection(db, 'users', uid, 'purchases'));
    const batch = writeBatch(db);
    
    batch.set(newRef, {
      ownerId: uid,
      date: new Date().toISOString(),
      supplierId,
      items: [],
      total: 0,
      paid: amount,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const supRef = doc(db, 'users', uid, 'suppliers', supplierId);
    const sup = suppliers.find(s => s.id === supplierId);
    if (sup) {
      batch.update(supRef, { balance: sup.balance - amount, updatedAt: Date.now() });
    }

    await batch.commit();
  };

  const markAllNotificationsRead = async () => {
    const batch = writeBatch(db);
    let updated = 0;
    notifications.forEach(n => {
      if (!n.read && updated < 500) {
         batch.update(doc(db, 'users', uid, 'notifications', n.id), { read: true, updatedAt: Date.now() });
         updated++;
      }
    });
    if (updated > 0) await batch.commit();
  };

  const updateBusinessProfile = async (profile: BusinessProfile) => {
    try {
      const dataToSave = {
        name: profile.name || 'العمدة',
        phone: profile.phone || '01000000000',
        address: profile.address || 'القاهرة، مصر',
        description: profile.description || 'نظام العمدة لإدارة قطع غيار السيارات والمخزون والمبيعات',
        logo: profile.logo || null,
        ownerId: uid,
        createdAt: businessProfile.createdAt || profile.createdAt || Date.now(),
        updatedAt: Date.now()
      };
      await setDoc(doc(db, 'users', uid, 'profile', 'businessProfile'), dataToSave);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${uid}/profile/businessProfile`);
    }
  };

  return (
    <AppDataContext.Provider value={{
      inventory, categories, customers, suppliers, invoices, purchases, notifications: currentNotifications, businessProfile,
      addInventoryItem, updateInventoryItem, deleteInventoryItem, addCategory, removeCategory,
      addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier, deleteSupplier, createInvoice, updateInvoice, deleteInvoice, createPurchase, recordCustomerPayment, recordSupplierPayment, markAllNotificationsRead, updateBusinessProfile
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
