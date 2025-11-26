

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update, remove, child, push } from 'firebase/database';
import { Customer, Employee, Invoice, InvoiceItem, GrindingType, ProductItem, PriceRule, AppSettings, ProcessingUnit, Agency, GoodsReceiptNote, Payment, ProcessingTicket, ProcessingTicketItem, DebtSummary, DebtSummaryTransaction, LabelDesign } from '../types';
import { COMPANY_INFO } from '../constants';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAb5AZOBvEVY3a_9ioEKTW-wuVMXdnRZGQ",
  authDomain: "sellglass-3ebe9.firebaseapp.com",
  databaseURL: "https://sellglass-3ebe9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sellglass-3ebe9",
  storageBucket: "sellglass-3ebe9.firbasestorage.app",
  messagingSenderId: "513741829035",
  appId: "1:513741829035:web:1b2c59dcf1a0be329358ee",
  measurementId: "G-1STVZT6NV4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRef = ref(database);

// Paths in Realtime Database
const PORTS = {
  CUSTOMERS: 'khachhang',
  INVOICES: 'hoadon',
  EMPLOYEES: 'users', 
  PRODUCTS: 'hanghoa',
  PROCESSING_UNITS: 'donvigiacong',
  PROCESSING_TICKETS: 'phieugiacong',
  AGENCIES: 'daily',
  GOODS_RECEIPTS: 'phieunhaphang',
  PAYMENTS: 'thanhtoan',
  PRICE_LIST: 'banggianiemyet',
  DEBTS: 'congno', 
  SETTINGS: 'caidat',
  COMPANY_INFO: 'thongtincongty',
  DEBT_SUMMARIES: 'doisoatcongno'
};

const DEFAULT_PRICE_LIST_KEY = 'default_guest';

// FIX: Moved these functions BEFORE the `db` object definition.
// This makes them available in the correct scope for the methods inside `db`.
const sanitizeFirebaseKey = (key: string) => key.replace(/[.#$[\]]/g, '_');
const desanitizeFirebaseKey = (key: string) => key.replace(/_/g, '.');

// Helper to format date as YYYY-MM-DD without timezone issues
const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const mapOldStatusToNew = (oldStatus: string): Invoice['status'] => {
    switch (oldStatus) {
        case 'da_giao':
            return 'da_giao';
        case 'da_cat':
            return 'da_cat';
        case 'moi':
        case 'san_xuat':
        case 'hoan_thanh':
        case 'huy':
            return 'chua_giao';
        default:
            return oldStatus as Invoice['status'] || 'chua_giao';
    }
}

// Robust date string parser
const safeGetDatePart = (dateStr: string | undefined | null) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    return dateStr.split('T')[0];
}

export const db = {
  // --- Customers (Khách hàng) ---
  getCustomers: async (): Promise<Customer[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.CUSTOMERS));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
            return {
                id: raw.ma || key,
                firebaseKey: key,
                code: raw.ma || '',
                name: raw.ten || '',
                address: raw.diachi || '',
                phone: raw.sdt || '',
                email: raw.email || '',
                type: raw.type || 'khach_le',
                paymentMode: (raw.hinhthuc === 'Công nợ' || raw.paymentMode === 'cong_no') ? 'cong_no' : 'tien_mat',
                currentDebt: Number(raw.congno || raw.currentDebt || 0),
                debtLimit: Number(raw.debtLimit || 0),
                tradeGroup: raw.nhomNghe || ''
            } as Customer;
        });
      }
      return [];
    } catch (error) {
      console.error("Error getting customers:", error);
      return [];
    }
  },
  
  getNextCustomerCode: async (): Promise<string> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.CUSTOMERS));
      if (!snapshot.exists()) return "KH0001";
      
      const data = snapshot.val();
      let maxNum = 0;
      
      Object.values(data).forEach((c: any) => {
          const code = c.ma || '';
          if (code.startsWith('KH')) {
              const numPart = parseInt(code.replace('KH', ''));
              if (!isNaN(numPart) && numPart > maxNum) {
                  maxNum = numPart;
              }
          }
      });

      return `KH${String(maxNum + 1).padStart(4, '0')}`;
    } catch (e) {
      return "KH0001";
    }
  },

  saveCustomer: async (customer: Customer): Promise<void> => {
    const key = customer.firebaseKey || push(child(dbRef, PORTS.CUSTOMERS)).key;
    if (!key) throw new Error("Could not generate a key for the new customer.");
    
    const firebaseData = {
        ma: customer.code || '',
        ten: customer.name || '',
        diachi: customer.address || '',
        sdt: customer.phone || '',
        email: customer.email || '',
        hinhthuc: customer.paymentMode === 'cong_no' ? 'Công nợ' : 'Tiền mặt',
        congno: Number(customer.currentDebt || 0),
        debtLimit: Number(customer.debtLimit || 0),
        type: customer.type || 'khach_le',
        nhomNghe: customer.tradeGroup || ''
    };

    await set(ref(database, `${PORTS.CUSTOMERS}/${key}`), firebaseData);
  },

  deleteCustomer: async (key: string): Promise<void> => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error("Lỗi: Mã khách hàng không hợp lệ để xóa.");
    }
    const path = `${PORTS.CUSTOMERS}/${key.trim()}`;
    console.log(`[DB] DELETING AT PATH: ${path}`);
    try {
      await remove(ref(database, path));
    } catch (error: any) {
        console.error(`[DB] FAILED TO DELETE customer at ${path}:`, error);
        throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },
  
  // --- Agencies (Đại lý / Nhà cung cấp) ---
  getAgencies: async (): Promise<Agency[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.AGENCIES));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
            return {
                id: raw.ma || key,
                firebaseKey: key,
                code: raw.ma || '',
                name: raw.ten || '',
                address: raw.diachi || '',
                phone: raw.sdt || '',
                email: raw.email || '',
                currentDebt: Number(raw.congno || 0)
            } as Agency;
        });
      }
      return [];
    } catch (error) {
      console.error("Error getting agencies:", error);
      return [];
    }
  },

  getNextAgencyCode: async (): Promise<string> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.AGENCIES));
      if (!snapshot.exists()) return "DL001";
      const data = snapshot.val();
      let maxNum = 0;
      Object.values(data).forEach((a: any) => {
          const code = a.ma || '';
          if (code.startsWith('DL')) {
              const numPart = parseInt(code.replace('DL', ''));
              if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
          }
      });
      return `DL${String(maxNum + 1).padStart(3, '0')}`;
    } catch (e) {
      return "DL001";
    }
  },

  saveAgency: async (agency: Agency): Promise<void> => {
    const key = agency.firebaseKey || push(child(dbRef, PORTS.AGENCIES)).key;
    if (!key) throw new Error("Could not generate key for new agency.");
    
    const firebaseData = {
        ma: agency.code || '',
        ten: agency.name || '',
        diachi: agency.address || '',
        sdt: agency.phone || '',
        email: agency.email || '',
        congno: Number(agency.currentDebt || 0)
    };
    await set(ref(database, `${PORTS.AGENCIES}/${key}`), firebaseData);
  },

  deleteAgency: async (key: string): Promise<void> => {
    if (!key) throw new Error("Lỗi: Mã đại lý không hợp lệ để xóa.");
    const path = `${PORTS.AGENCIES}/${key.trim()}`;
    try {
      await remove(ref(database, path));
    } catch (error) {
      console.error(`[DB] FAILED TO DELETE agency at ${path}:`, error);
      throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },

  updateAgencyDebtByChange: async (agencyId: string, amountChange: number) => {
    const agencyRef = ref(database, `${PORTS.AGENCIES}/${agencyId}`);
    const snapshot = await get(agencyRef);
    if (snapshot.exists()) {
      const agency = snapshot.val();
      const currentDebt = Number(agency.congno || 0);
      const newDebt = currentDebt + amountChange;
      await update(agencyRef, { congno: newDebt });
    }
  },

  // --- Products (Hàng hóa) ---
  getProducts: async (): Promise<ProductItem[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PRODUCTS));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
            return {
                id: raw.ma || key,
                firebaseKey: key,
                code: raw.ma || '',
                name: raw.ten || raw.name || '',
                unit: raw.donvitinh || raw.unit || 'm2'
            };
        });
      }
      return [];
    } catch (error) {
      console.warn("Products not found or error", error);
      return [];
    }
  },

  getNextProductCode: async (): Promise<string> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PRODUCTS));
      if (!snapshot.exists()) return "HH00001";
      
      const data = snapshot.val();
      let maxNum = 0;
      
      Object.values(data).forEach((p: any) => {
          const code = p.ma || '';
          if (code.startsWith('HH')) {
              const numPart = parseInt(code.replace('HH', ''));
              if (!isNaN(numPart) && numPart > maxNum) {
                  maxNum = numPart;
              }
          }
      });

      return `HH${String(maxNum + 1).padStart(5, '0')}`;
    } catch (e) {
      return "HH00001";
    }
  },
  
  saveProduct: async (product: ProductItem): Promise<void> => {
    const key = product.firebaseKey || push(child(dbRef, PORTS.PRODUCTS)).key;
    if (!key) throw new Error("Could not generate a key for the new product.");
    
    const firebaseData = {
        ma: product.code || '',
        ten: product.name || ''
    };

    await set(ref(database, `${PORTS.PRODUCTS}/${key}`), firebaseData);
  },

  deleteProduct: async (key: string): Promise<void> => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error("Lỗi: Mã hàng hóa không hợp lệ để xóa.");
    }
    const path = `${PORTS.PRODUCTS}/${key.trim()}`;
    console.log(`[DB] DELETING AT PATH: ${path}`);
    try {
      await remove(ref(database, path));
    } catch (error: any) {
        console.error(`[DB] FAILED TO DELETE product at ${path}:`, error);
        throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },

    // --- Processing Units (Đơn vị gia công) ---
  getProcessingUnits: async (): Promise<ProcessingUnit[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PROCESSING_UNITS));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
            return {
                id: raw.ma || key,
                firebaseKey: key,
                code: raw.ma || '',
                name: raw.ten || '',
                phone: raw.sdt || '',
                address: raw.diachi || '',
                email: raw.email || '',
                tradeGroup: raw.nhomNghe || ''
            };
        });
      }
      return [];
    } catch (error) {
      console.error("Error getting processing units:", error);
      return [];
    }
  },

  getNextProcessingUnitCode: async (): Promise<string> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PROCESSING_UNITS));
      if (!snapshot.exists()) return "DVGC_1";
      
      const data = snapshot.val();
      let maxNum = 0;
      
      Object.values(data).forEach((p: any) => {
          const code = p.ma || '';
          if (code.startsWith('DVGC_')) {
              const numPart = parseInt(code.replace('DVGC_', ''));
              if (!isNaN(numPart) && numPart > maxNum) {
                  maxNum = numPart;
              }
          }
      });

      return `DVGC_${maxNum + 1}`;
    } catch (e) {
      return "DVGC_1";
    }
  },
  
  saveProcessingUnit: async (unit: ProcessingUnit): Promise<void> => {
    const key = unit.firebaseKey || push(child(dbRef, PORTS.PROCESSING_UNITS)).key;
    if (!key) throw new Error("Could not generate a key for the new unit.");
    
    const firebaseData = {
        ma: unit.code || '',
        ten: unit.name || '',
        sdt: unit.phone || '',
        diachi: unit.address || '',
        email: unit.email || '',
        nhomNghe: unit.tradeGroup || ''
    };

    await set(ref(database, `${PORTS.PROCESSING_UNITS}/${key}`), firebaseData);
  },

  deleteProcessingUnit: async (key: string): Promise<void> => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error("Lỗi: Mã đơn vị không hợp lệ để xóa.");
    }
    const path = `${PORTS.PROCESSING_UNITS}/${key.trim()}`;
    console.log(`[DB] DELETING AT PATH: ${path}`);
    try {
      await remove(ref(database, path));
    } catch (error: any) {
        console.error(`[DB] FAILED TO DELETE processing unit at ${path}:`, error);
        throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },

    // --- Price List (Bảng giá niêm yết) ---
    getPriceRulesForCustomer: async (customerId: string): Promise<PriceRule[]> => {
        const path = `${PORTS.PRICE_LIST}/${customerId}`;
        try {
            const snapshot = await get(child(dbRef, path));
            if (snapshot.exists()) {
                const data = snapshot.val();
                return Object.keys(data).map(sanitizedKey => {
                    const productCode = desanitizeFirebaseKey(sanitizedKey);
                    const ruleData = data[sanitizedKey];
                    return {
                        ...ruleData,
                        id: productCode,
                        productCode: productCode,
                    };
                });
            }
            return [];
        } catch (error) {
            console.error(`Error getting price rules for ${customerId}:`, error);
            return [];
        }
    },
    savePriceRulesForCustomer: async (customerId: string, rules: PriceRule[]): Promise<void> => {
        const path = `${PORTS.PRICE_LIST}/${customerId}`;
        const dataToSave = rules.reduce((acc, rule) => {
            if (!rule.productCode) return acc;
            const sanitizedKey = sanitizeFirebaseKey(rule.productCode);
            acc[sanitizedKey] = {
                productName: rule.productName,
                glassPrice: rule.glassPrice,
                temperedGlassPrice: rule.temperedGlassPrice,
                grindingPrice: rule.grindingPrice,
                drillPrice: rule.drillPrice,
                cutoutPrice: rule.cutoutPrice,
            };
            return acc;
        }, {} as any);
        await set(ref(database, path), dataToSave);
    },
    getApplicablePriceRule: async (productCode: string, customerId: string): Promise<PriceRule | null> => {
        if (!productCode) return null;
        const sanitizedProductCode = sanitizeFirebaseKey(productCode);
        
        // 1. Try customer-specific price
        if (customerId && customerId !== DEFAULT_PRICE_LIST_KEY) {
             const customerRulePath = `${PORTS.PRICE_LIST}/${customerId}/${sanitizedProductCode}`;
             const snapshot = await get(child(dbRef, customerRulePath));
             if (snapshot.exists()) {
                 const data = snapshot.val();
                 return { ...data, id: productCode, productCode };
             }
        }
        // 2. Fallback to default guest price
        const defaultRulePath = `${PORTS.PRICE_LIST}/${DEFAULT_PRICE_LIST_KEY}/${sanitizedProductCode}`;
        const snapshot = await get(child(dbRef, defaultRulePath));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return { ...data, id: productCode, productCode };
        }
        
        return null;
    },

  // --- Invoices (Hóa đơn) ---
  getInvoices: async (): Promise<Invoice[]> => {
    try {
        const snapshot = await get(child(dbRef, PORTS.INVOICES));
        if (!snapshot.exists()) {
            return [];
        }
        const data = snapshot.val();
        
        const invoices = Object.keys(data).map((key): Invoice | null => {
            const inv = data[key];
            
            if (!inv || typeof inv !== 'object') {
                console.warn(`[DB] Dữ liệu hóa đơn không hợp lệ tại key: ${key}. Dữ liệu bị bỏ qua.`, inv);
                return null;
            }

            let items: any[] = [];
            if (inv.items) {
                if (Array.isArray(inv.items)) {
                    items = inv.items;
                } else if (typeof inv.items === 'object' && inv.items !== null) {
                    items = Object.values(inv.items);
                }
            }

            const mappedItems = items
                .filter(i => i && typeof i === 'object')
                .map((i: any): InvoiceItem => ({
                    id: i.id || Math.random().toString(),
                    productCode: i.maHang || i.productCode || '',
                    description: i.tenHang || i.description || '',
                    width: Number(i.hs2 || i.width || 0),
                    height: Number(i.hs1 || i.height || 0),
                    quantity: Number(i.soTam || i.quantity || 0),
                    area: Number(i.m2 || i.area || 0),
                    grindingType: i.kieuMai || i.grindingType || 'none',
                    grindingLength: Number(i.metMai || i.grindingLength || 0),
                    grindingUnitPrice: Number(i.donGiaMai || 0),
                    grindingPrice: Number(i.tienMai || i.grindingPrice || 0),
                    drillHoles: Number(i.soLo || i.drillHoles || 0),
                    drillUnitPrice: Number(i.donGiaKhoan || 0),
                    drillPrice: Number(i.tienKhoan || i.drillPrice || 0),
                    cutouts: Number(i.soKhoet || i.cutouts || 0),
                    cutoutUnitPrice: Number(i.donGiaKhoet || 0),
                    cutoutPrice: Number(i.tienKhoet || i.cutoutPrice || 0),
                    unitPrice: Number(i.donGia || i.unitPrice || 0),
                    total: Number(i.thanhTien || i.total || 0)
                }));

            const subTotal = mappedItems.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);

            // FIX: Explicitly type `paymentType` to match the `Invoice` interface, resolving TypeScript inference errors.
            const paymentType: Invoice['paymentType'] = (inv.hinhthuc === 'Công nợ' || inv.paymentType === 'cong_no') ? 'cong_no' : 'tien_mat';

            return {
                id: inv.maHD || key, 
                firebaseKey: key,
                customerId: inv.khachhangId || '',
                customerName: inv.tenkhachhang || inv.customerName || 'Khách lẻ',
                customerAddress: inv.diachi || inv.customerAddress || '',
                customerPhone: inv.sdt || inv.customerPhone || '',
                date: inv.ngayLap || inv.date || new Date().toISOString(),
                deliveryDate: inv.ngayGiao || undefined,
                items: mappedItems,
                subTotal: subTotal,
                transportFee: Number(inv.tienXe || inv.transportFee || 0),
                discount: Number(inv.chietKhau || inv.discount || 0),
                deposit: Number(inv.tienCoc || inv.deposit || 0),
                totalAmount: Number(inv.tongTien || inv.totalAmount || 0),
                remainingAmount: Number(inv.conLai || inv.remainingAmount || 0),
                paymentType: paymentType,
                status: mapOldStatusToNew(inv.trangThai || inv.status),
                paymentStatus: inv.trangThaiThanhToan || inv.paymentStatus || 'chua_thanh_toan',
                note: inv.ghiChu || '',
                qrCodeContent: inv.qrCodeContent || '',
                createdBy: inv.nguoiLap || inv.createdBy || 'Admin',
                deliveryBy: inv.nguoiGiao || inv.deliveryBy || ''
            };
        }).filter((inv): inv is Invoice => inv !== null);
        
        return invoices;
    } catch (error) {
        console.error("Lỗi nghiêm trọng khi tải hóa đơn:", error);
        return [];
    }
  },

  saveInvoice: async (invoice: Invoice, originalInvoice?: Invoice | null): Promise<void> => {
    const key = invoice.firebaseKey || invoice.id; 
    const firebaseData = {
        maHD: invoice.id,
        khachhangId: invoice.customerId,
        tenkhachhang: invoice.customerName,
        diachi: invoice.customerAddress,
        sdt: invoice.customerPhone,
        ngayLap: safeGetDatePart(invoice.date),
        ngayGiao: invoice.deliveryDate ? safeGetDatePart(invoice.deliveryDate) : '',
        createdAt: new Date().toISOString(),
        hinhthuc: invoice.paymentType === 'cong_no' ? 'Công nợ' : 'Tiền mặt',
        trangThai: invoice.status,
        trangThaiThanhToan: invoice.paymentStatus || 'chua_thanh_toan',
        ghiChu: invoice.note || '',
        qrCodeContent: invoice.qrCodeContent || '',
        tongTien: invoice.totalAmount,
        tienCoc: invoice.deposit,
        conLai: invoice.remainingAmount,
        tienXe: invoice.transportFee,
        chietKhau: invoice.discount,
        nguoiLap: invoice.createdBy,
        nguoiGiao: invoice.deliveryBy || '',
        items: invoice.items.map((item) => ({
            maHang: item.productCode || '',
            tenHang: item.description,
            hs1: item.height,
            hs2: item.width,
            soTam: item.quantity,
            m2: item.area,
            met: item.area,
            donGia: item.unitPrice,
            thanhTien: item.total,
            kieuMai: item.grindingType,
            metMai: item.grindingLength,
            donGiaMai: item.grindingUnitPrice,
            tienMai: item.grindingPrice,
            soLo: item.drillHoles,
            donGiaKhoan: item.drillUnitPrice,
            tienKhoan: item.drillPrice,
            soKhoet: item.cutouts,
            donGiaKhoet: item.cutoutUnitPrice,
            tienKhoet: item.cutoutPrice
        }))
    };

    await set(ref(database, `${PORTS.INVOICES}/${key}`), firebaseData);

    if (invoice.customerId && !invoice.customerId.startsWith('temp_') && invoice.paymentType === 'cong_no') {
        let debtChange = 0;
        if (originalInvoice) {
            const oldDebt = originalInvoice.remainingAmount || 0;
            const newDebt = invoice.remainingAmount || 0;
            debtChange = newDebt - oldDebt;
        } else {
            debtChange = invoice.remainingAmount || 0;
        }
        
        if (debtChange !== 0) {
            await db.updateCustomerDebtByChange(invoice.customerId, debtChange);
        }
    }
  },

  deleteInvoice: async (key: string): Promise<void> => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error("Lỗi: Mã hóa đơn không hợp lệ để xóa.");
    }
    const path = `${PORTS.INVOICES}/${key.trim()}`;
    
    const invoiceSnapshot = await get(child(dbRef, path));
    if (invoiceSnapshot.exists()) {
        const invoice = invoiceSnapshot.val();
        if (invoice.khachhangId && (invoice.hinhthuc === 'Công nợ' || invoice.paymentType === 'cong_no')) {
            const debtChange = -Number(invoice.conLai || invoice.remainingAmount || 0);
            if (debtChange !== 0) {
                await db.updateCustomerDebtByChange(invoice.khachhangId, debtChange);
            }
        }
    } else {
        console.warn(`Invoice ${key} not found for deletion, cannot update debt.`);
    }

    try {
        await remove(ref(database, path));
    } catch (error: any) {
        console.error(`[DB] FAILED TO DELETE invoice at ${path}:`, error);
        throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },

  // --- Goods Receipts (Phiếu Nhập Hàng) ---
  getGoodsReceiptNotes: async (): Promise<GoodsReceiptNote[]> => {
    try {
        const snapshot = await get(child(dbRef, PORTS.GOODS_RECEIPTS));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => {
                const raw = data[key];
                return {
                    id: raw.id || key,
                    firebaseKey: key,
                    agencyId: raw.agencyId || '',
                    agencyName: raw.agencyName || '',
                    date: raw.date || new Date().toISOString(),
                    items: Array.isArray(raw.items) ? raw.items : [],
                    totalAmount: Number(raw.totalAmount || 0),
                    paymentType: raw.paymentType || 'tien_mat',
                    note: raw.note || '',
                    createdBy: raw.createdBy || '',
                    deliveredBy: raw.deliveredBy || '',
                    receivedBy: raw.receivedBy || '',
                };
            });
        }
        return [];
    } catch (error) {
        console.error("Error getting goods receipts:", error);
        return [];
    }
  },

  getNextGoodsReceiptNoteCode: async (): Promise<string> => {
      const date = new Date();
      const prefix = `PN${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
      const snapshot = await get(child(dbRef, PORTS.GOODS_RECEIPTS));
      let count = 1;
      if (snapshot.exists()) {
          const keys = Object.keys(snapshot.val());
          const todayKeys = keys.filter(k => k.startsWith(prefix));
          count = todayKeys.length + 1;
      }
      return `${prefix}-${String(count).padStart(4, '0')}`;
  },

  saveGoodsReceiptNote: async (note: GoodsReceiptNote, originalNote?: GoodsReceiptNote | null): Promise<void> => {
      const key = note.firebaseKey || note.id;
      const firebaseData = {
        id: note.id,
        agencyId: note.agencyId,
        agencyName: note.agencyName,
        date: note.date,
        items: note.items,
        totalAmount: note.totalAmount,
        paymentType: note.paymentType,
        note: note.note || '',
        createdBy: note.createdBy,
        deliveredBy: note.deliveredBy || '',
        receivedBy: note.receivedBy || ''
      };
      await set(ref(database, `${PORTS.GOODS_RECEIPTS}/${key}`), firebaseData);

      if (note.agencyId && note.paymentType === 'cong_no') {
          let debtChange = 0;
          if (originalNote) {
              const oldDebt = originalNote.totalAmount || 0;
              const newDebt = note.totalAmount || 0;
              debtChange = newDebt - oldDebt;
          } else {
              debtChange = note.totalAmount || 0;
          }

          if (debtChange !== 0) {
              await db.updateAgencyDebtByChange(note.agencyId, debtChange);
          }
      }
  },

  deleteGoodsReceiptNote: async (key: string): Promise<void> => {
      if (!key) throw new Error("Lỗi: Mã phiếu nhập không hợp lệ để xóa.");
      const path = `${PORTS.GOODS_RECEIPTS}/${key.trim()}`;
      
      const noteSnapshot = await get(child(dbRef, path));
      if (noteSnapshot.exists()) {
          const note = noteSnapshot.val();
          if (note.agencyId && note.paymentType === 'cong_no') {
              const debtChange = -Number(note.totalAmount || 0);
              if (debtChange !== 0) {
                  await db.updateAgencyDebtByChange(note.agencyId, debtChange);
              }
          }
      } else {
          console.warn(`Goods Receipt ${key} not found for deletion, cannot update debt.`);
      }

      try {
          await remove(ref(database, path));
      } catch (error) {
          console.error(`[DB] FAILED TO DELETE goods receipt at ${path}:`, error);
          throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
      }
  },

  // --- Payments (Thanh toán) ---
  getPaymentsByCustomerId: async (customerId: string): Promise<Payment[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PAYMENTS));
      if (!snapshot.exists()) return [];
      
      const allPayments = snapshot.val();
      const customerPayments = Object.keys(allPayments)
        .map(key => ({ ...allPayments[key], firebaseKey: key, id: key }))
        .filter(p => p.customerId === customerId);

      return customerPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error("Error getting payments:", error);
      return [];
    }
  },

  getAllPayments: async (): Promise<Payment[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.PAYMENTS));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({
          ...data[key],
          id: key,
          firebaseKey: key,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error getting all payments:", error);
      return [];
    }
  },

  savePayment: async (payment: Payment, originalPayment: Payment | null = null): Promise<void> => {
    const isUpdate = !!payment.firebaseKey;
    const key = payment.firebaseKey || push(child(dbRef, PORTS.PAYMENTS)).key;
    if (!key) throw new Error("Không thể tạo mã cho thanh toán mới.");

    const firebaseData: Omit<Payment, 'id' | 'firebaseKey'> = {
        customerId: payment.customerId,
        customerName: payment.customerName,
        date: payment.date || new Date().toISOString().split('T')[0],
        amount: payment.amount,
        method: payment.method,
        note: payment.note,
        type: payment.type,
    };
    
    await set(ref(database, `${PORTS.PAYMENTS}/${key}`), firebaseData);

    let debtChange = 0;
    if (isUpdate && originalPayment) {
        const oldDebtEffect = originalPayment.type === 'payment' ? -originalPayment.amount : originalPayment.amount;
        const newDebtEffect = payment.type === 'payment' ? -payment.amount : payment.amount;
        debtChange = newDebtEffect - oldDebtEffect;
    } else {
        if (payment.type === 'payment') {
            debtChange = -payment.amount;
        } else if (payment.type === 'debt_adjustment') {
            debtChange = payment.amount;
        }
    }

    if (debtChange !== 0 && payment.customerId) {
        await db.updateCustomerDebtByChange(payment.customerId, debtChange);
    }
  },
  
  deletePayment: async (paymentKey: string): Promise<void> => {
    if (!paymentKey) throw new Error("Mã thanh toán không hợp lệ.");

    const paymentRef = ref(database, `${PORTS.PAYMENTS}/${paymentKey}`);
    const snapshot = await get(paymentRef);
    if (!snapshot.exists()) {
      console.warn("Payment to delete not found, skipping debt update.");
      return;
    }
    const payment: Payment = { ...snapshot.val(), firebaseKey: paymentKey, id: paymentKey };

    let debtReversion = 0;
    if (payment.type === 'payment') {
      debtReversion = payment.amount;
    } else if (payment.type === 'debt_adjustment') {
      debtReversion = -payment.amount;
    }
    
    if (debtReversion !== 0 && payment.customerId) {
      await db.updateCustomerDebtByChange(payment.customerId, debtReversion);
    }
    
    await remove(paymentRef);
  },

  // --- Employees (Users/Nhân viên) ---
  getEmployees: async (): Promise<Employee[]> => {
    try {
      const snapshot = await get(child(dbRef, PORTS.EMPLOYEES));
      if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
            return {
                id: key, 
                firebaseKey: key, // CRITICAL
                username: raw.username || key,
                fullName: raw.hoten || '',
                address: raw.diachi || '',
                phone: raw.sdt || '',
                birthDate: raw.ngaysinh || '',
                password: raw.password || ''
            };
        });
      }
      return [];
    } catch (error) {
      console.error("Error getting employees:", error);
      return [];
    }
  },
  
  saveEmployee: async (emp: Employee) => {
    const userId = emp.firebaseKey || emp.username; 
    await set(ref(database, `${PORTS.EMPLOYEES}/${userId}`), { 
        username: emp.username,
        hoten: emp.fullName,
        diachi: emp.address,
        sdt: emp.phone,
        ngaysinh: emp.birthDate,
        password: emp.password
    });
  },
  
  deleteEmployee: async (key: string) => {
    if (!key || typeof key !== 'string' || key.trim() === '') {
        throw new Error("Lỗi: Tên đăng nhập không hợp lệ để xóa.");
    }
    const path = `${PORTS.EMPLOYEES}/${key.trim()}`;
    console.log(`[DB] DELETING AT PATH: ${path}`);
    try {
        await remove(ref(database, path));
    } catch (error: any) {
        console.error(`[DB] FAILED TO DELETE employee at ${path}:`, error);
        throw new Error(`Xóa thất bại. Vui lòng kiểm tra lại quyền truy cập (Security Rules) trong Firebase.`);
    }
  },

  // --- Settings (Processing Types, etc) ---
  getGrindingSettings: async (): Promise<GrindingType[]> => {
    try {
        const snapshot = await get(child(dbRef, `${PORTS.SETTINGS}/kieugiaocong`));
        if (snapshot.exists() && Array.isArray(snapshot.val())) {
            return snapshot.val();
        } else {
            // If it doesn't exist or is not an array, return a default set for first-time setup
            return [
                { id: 'g1', code: 'none', name: 'Không mài', pricePerMeter: 0 },
                { id: 'g2', code: '4c', name: 'Mài 4 cạnh', pricePerMeter: 15000 },
                { id: 'g3', code: '2d', name: 'Mài 2 cạnh dài', pricePerMeter: 15000 },
                { id: 'g4', code: '2n', name: 'Mài 2 cạnh ngắn', pricePerMeter: 15000 },
                { id: 'g5', code: '1d', name: 'Mài 1 cạnh dài', pricePerMeter: 15000 },
                { id: 'g6', code: '1n', name: 'Mài 1 cạnh ngắn', pricePerMeter: 15000 },
            ];
        }
    } catch (e) {
        console.error("Error getting grinding settings:", e);
        return [];
    }
  },

  saveGrindingSettings: async (grindingTypes: GrindingType[]): Promise<void> => {
      await set(ref(database, `${PORTS.SETTINGS}/kieugiaocong`), grindingTypes);
  },

  getAppSettings: async (): Promise<AppSettings> => {
    const defaultCompany = {
        name: COMPANY_INFO.name,
        address: COMPANY_INFO.address,
        phone: COMPANY_INFO.phone,
        email: COMPANY_INFO.email,
        bankInfo: '',
        taxCode: '',
        logoUrl: '',
        qrCodeUrl: '',
    };
    
    const defaultLabelDesign: LabelDesign = {
      width: 60,
      height: 40,
      borderRadius: 3,
      elements: [
        { id: 'customerName', type: 'text', contentKey: 'customerName', x: 30, y: 3, fontSize: 8, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 58 },
        { id: 'line1', type: 'line', x: 2, y: 7, width: 56, height: 0.3, backgroundColor: '#000000', rotation: 0, isDeletable: true },
        { id: 'productDescription', type: 'text', contentKey: 'productDescription', x: 30, y: 9, fontSize: 7, fontWeight: 'normal', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 58 },
        { id: 'dimensions', type: 'text', contentKey: 'dimensions', x: 30, y: 17, fontSize: 16, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 58 },
        { id: 'pageNumber', type: 'text', contentKey: 'pageNumber', x: 5, y: 28, fontSize: 7, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 10 },
        { id: 'grindingType', type: 'text', contentKey: 'grindingType', x: 30, y: 28, fontSize: 8, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 20 },
        { id: 'itemIndex', type: 'text', contentKey: 'itemIndex', x: 55, y: 28, fontSize: 8, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 0, isDeletable: true, width: 20 },
        { id: 'dateTime', type: 'text', contentKey: 'dateTime', x: 4, y: 36, fontSize: 5, fontWeight: 'normal', fontStyle: 'normal', textAlign: 'left', rotation: 0, isDeletable: true, width: 30 },
        { id: 'companyInfo', type: 'text', contentKey: 'companyInfo', x: 56, y: 36, fontSize: 6, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'right', rotation: 0, isDeletable: true, width: 40 },
        { id: 'invoiceId', type: 'text', contentKey: 'invoiceId', x: 58, y: 20, fontSize: 6, fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', rotation: 270, isDeletable: true, width: 40 },
      ]
    };

    try {
        const [configSnap, companySnap, labelDesignSnap] = await Promise.all([
            get(child(dbRef, `${PORTS.SETTINGS}/config`)),
            get(child(dbRef, PORTS.COMPANY_INFO)),
            get(child(dbRef, `${PORTS.SETTINGS}/labelDesign`))
        ]);

        const configVal = configSnap.exists() ? configSnap.val() : {};
        let companyData = defaultCompany;
        if (companySnap.exists()) {
            const val = companySnap.val();
            companyData = {
                name: val.tenCongTy || defaultCompany.name,
                address: val.diaChi || defaultCompany.address,
                phone: val.dienThoai || defaultCompany.phone,
                email: val.email || defaultCompany.email,
                bankInfo: val.thongTinNganHang || defaultCompany.bankInfo,
                taxCode: val.maSoThue || '',
                logoUrl: val.logoUrl || '',
                qrCodeUrl: val.qrCodeUrl || '',
            };
        }
        
        const labelDesign = labelDesignSnap.exists() ? labelDesignSnap.val() : defaultLabelDesign;

        return {
            itemsPerPage: configVal.itemsPerPage || 10,
            companyNameSize: configVal.companyNameSize || 16,
            invoiceTitleSize: configVal.invoiceTitleSize || 28,
            labelWidth: labelDesign.width || 80,
            labelHeight: labelDesign.height || 50,
            defaultLabelPrinter: configVal.defaultLabelPrinter || '',
            productAttributes: configVal.productAttributes || ['C.lực', 'Bóng', 'Vát', 'Sơn', 'Bản vẽ', 'Rập'],
            customerTradeGroups: configVal.customerTradeGroups || ['Xưởng sản xuất', 'Công trình', 'Cửa hàng'],
            processingUnitTradeGroups: configVal.processingUnitTradeGroups || ['Cường lực', 'Mài', 'Ghép keo', 'Sơn'],
            companyInfo: companyData,
            labelDesign: labelDesign,
        };
    } catch(e) {
        return { 
            itemsPerPage: 10,
            companyNameSize: 16,
            invoiceTitleSize: 28,
            labelWidth: 80,
            labelHeight: 50,
            defaultLabelPrinter: '',
            productAttributes: ['C.lực', 'Bóng', 'Vát', 'Sơn', 'Bản vẽ', 'Rập'],
            customerTradeGroups: ['Xưởng sản xuất', 'Công trình', 'Cửa hàng'],
            processingUnitTradeGroups: ['Cường lực', 'Mài', 'Ghép keo', 'Sơn'],
            companyInfo: defaultCompany,
            labelDesign: defaultLabelDesign
        };
    }
  },

  saveAppSettings: async (settings: AppSettings): Promise<void> => {
    const configData = {
        itemsPerPage: settings.itemsPerPage,
        companyNameSize: settings.companyNameSize || 16,
        invoiceTitleSize: settings.invoiceTitleSize || 28,
        labelWidth: settings.labelDesign?.width || settings.labelWidth || 80,
        labelHeight: settings.labelDesign?.height || settings.labelHeight || 50,
        defaultLabelPrinter: settings.defaultLabelPrinter || '',
        productAttributes: settings.productAttributes,
        customerTradeGroups: settings.customerTradeGroups,
        processingUnitTradeGroups: settings.processingUnitTradeGroups
    };
    
    await set(ref(database, `${PORTS.SETTINGS}/config`), configData);

    if (settings.labelDesign) {
        await set(ref(database, `${PORTS.SETTINGS}/labelDesign`), settings.labelDesign);
    }

    if (settings.companyInfo) {
        await set(ref(database, PORTS.COMPANY_INFO), {
            tenCongTy: settings.companyInfo.name,
            diaChi: settings.companyInfo.address,
            dienThoai: settings.companyInfo.phone,
            email: settings.companyInfo.email || '',
            maSoThue: settings.companyInfo.taxCode || '',
            thongTinNganHang: settings.companyInfo.bankInfo || '',
            logoUrl: settings.companyInfo.logoUrl || '',
qrCodeUrl: settings.companyInfo.qrCodeUrl || '',
            updatedAt: new Date().toISOString()
        });
    }
  },
  
  // --- Logic Helpers ---
  getNextInvoiceId: async (): Promise<string> => {
    const snapshot = await get(child(dbRef, PORTS.INVOICES));
    let count = 1;
    if (snapshot.exists()) {
      count = Object.keys(snapshot.val()).length + 1;
    }
    
    const date = new Date();
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const todayPrefix = `HD${y}${m}${d}`; 
    
    return `${todayPrefix}${String(count).padStart(4, '0')}`;
  },

  updateCustomerDebtByChange: async (customerId: string, amountChange: number) => {
    const custRef = ref(database, `${PORTS.CUSTOMERS}/${customerId}`);
    const snapshot = await get(custRef);
    if (snapshot.exists()) {
      const customer = snapshot.val();
      const currentDebt = Number(customer.congno || customer.currentDebt || 0);
      const newDebt = currentDebt + amountChange;
      await update(custRef, { congno: newDebt });
    }
  },

  // --- Dashboard Stats ---
  getDashboardStats: async (filter: { period: 'today' | 'week' | 'month' | 'year' }) => {
    try {
        // 1. Determine date range
        const now = new Date();
        let startDate: Date;
        let endDate: Date = new Date(); // end is always today

        switch (filter.period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                startDate = new Date(new Date().setDate(diff));
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
        }

        endDate.setHours(23, 59, 59, 999);
        const startDateStr = safeGetDatePart(startDate.toISOString());
        const endDateStr = safeGetDatePart(endDate.toISOString());

        const [invoices, customers] = await Promise.all([db.getInvoices(), db.getCustomers()]);

        const filteredInvoices = invoices.filter(inv => {
            const invDate = safeGetDatePart(inv.date);
            return invDate >= startDateStr && invDate <= endDateStr;
        });

        // 2. Calculate stats from filtered invoices
        const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
        const totalInvoices = filteredInvoices.length;
        const totalGoods = filteredInvoices.reduce((sum, inv) => sum + (inv.items || []).reduce((s, i) => s + (i.quantity || 0), 0), 0);
        const totalCustomers = customers.length; // This is always total, not period-based

        const productRevenueMap = new Map<string, { total: number, quantity: number }>();
        filteredInvoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                const current = productRevenueMap.get(item.description) || { total: 0, quantity: 0 };
                current.total += item.total;
                current.quantity += item.quantity;
                productRevenueMap.set(item.description, current);
            });
        });

        const revenueByProduct = Array.from(productRevenueMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
            
        // 3. Prepare chart data
        let chartLabels: string[] = [];
        let revenueData: number[] = [];
        let quantityData: number[] = [];
        
        if (filter.period === 'year') {
            chartLabels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
            revenueData = Array(12).fill(0);
            quantityData = Array(12).fill(0);
            filteredInvoices.forEach(inv => {
                const month = new Date(inv.date).getMonth();
                revenueData[month] += inv.totalAmount || 0;
                quantityData[month] += (inv.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
            });
        } else { // Group by day for month, week, today
            const daysInRange: { [key: string]: { revenue: number, quantity: number } } = {};
            
            let iterDate = new Date(startDate);
            while (iterDate <= endDate) {
                if (iterDate > now) break; // Don't project into the future
                const key = safeGetDatePart(iterDate.toISOString());
                daysInRange[key] = { revenue: 0, quantity: 0 };
                iterDate.setDate(iterDate.getDate() + 1);
            }

            filteredInvoices.forEach(inv => {
                const key = safeGetDatePart(inv.date);
                if (daysInRange[key]) {
                    daysInRange[key].revenue += inv.totalAmount || 0;
                    daysInRange[key].quantity += (inv.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
                }
            });
            
            if (filter.period === 'week') {
                const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                chartLabels = Object.keys(daysInRange).map(dateStr => weekDays[new Date(dateStr + 'T00:00:00').getDay()]);
            } else {
                chartLabels = Object.keys(daysInRange).map(dateStr => new Date(dateStr + 'T00:00:00').getDate().toString());
            }
            
            revenueData = Object.values(daysInRange).map(d => d.revenue);
            quantityData = Object.values(daysInRange).map(d => d.quantity);
        }
        
        return {
            totalRevenue,
            totalInvoices,
            totalGoods,
            totalCustomers,
            revenueByProduct,
            chartLabels,
            revenueData,
            quantityData
        };
    } catch (error) {
        console.error("Stats error", error);
        return {
            totalRevenue: 0,
            totalInvoices: 0,
            totalGoods: 0,
            totalCustomers: 0,
            revenueByProduct: [],
            chartLabels: [],
            revenueData: [],
            quantityData: []
        };
    }
  },

  // --- Processing Tickets (Phiếu Gia Công) ---
  getProcessingTickets: async (): Promise<ProcessingTicket[]> => {
    try {
        const snapshot = await get(child(dbRef, PORTS.PROCESSING_TICKETS));
        if (!snapshot.exists()) return [];
        const data = snapshot.val();
        return Object.keys(data).map(key => {
            const raw = data[key];
             const items = (raw.items || []).map((item: any): ProcessingTicketItem => ({
                id: item.id || Math.random().toString(),
                description: item.tenHang || '',
                width: item.hs2 || 0,
                height: item.hs1 || 0,
                quantity: item.soTam || 0,
                area: item.m2 || 0,
                processingType: item.loaiGiaCong || '',
                grindingType: item.kieuMai || '',
                notes: item.ghiChuItem || '',
                sourceInvoiceId: item.maHDGoc || '',
                customerName: item.tenKH || '',
                unitPrice: item.donGia || 0,
                total: item.thanhTien || 0,
            }));
            return {
                id: raw.id || key,
                firebaseKey: key,
                processingUnitId: raw.donViGiaCongId || '',
                processingUnitName: raw.tenDonViGiaCong || '',
                date: raw.ngayLap || '',
                items: items,
                totalArea: raw.tongM2 || 0,
                totalQuantity: raw.tongSoTam || 0,
                totalAmount: raw.tongTien || 0,
                note: raw.ghiChu || '',
                status: raw.trangThai || 'new',
            } as ProcessingTicket;
        });
    } catch (error) {
        console.error("Error getting processing tickets:", error);
        return [];
    }
  },
  getNextProcessingTicketId: async (): Promise<string> => {
    const timestamp = Date.now().toString().slice(-6);
    return `GC_${timestamp}`;
  },
  saveProcessingTicket: async (ticket: ProcessingTicket): Promise<void> => {
    const key = ticket.firebaseKey || ticket.id;
    if (!key) throw new Error("Could not generate key for new processing ticket.");
    const totalAmount = ticket.items.reduce((sum, item) => sum + (item.total || 0), 0);

    const firebaseData = {
        id: ticket.id,
        donViGiaCongId: ticket.processingUnitId,
        tenDonViGiaCong: ticket.processingUnitName,
        ngayLap: ticket.date,
        ghiChu: ticket.note || '',
        trangThai: ticket.status,
        tongM2: ticket.totalArea,
        tongSoTam: ticket.totalQuantity,
        tongTien: totalAmount,
        items: ticket.items.map(item => ({
            tenHang: item.description,
            hs1: item.height,
            hs2: item.width,
            soTam: item.quantity,
            m2: item.area,
            loaiGiaCong: item.processingType,
            kieuMai: item.grindingType || '',
            ghiChuItem: item.notes || '',
            maHDGoc: item.sourceInvoiceId || '',
            tenKH: item.customerName || '',
            donGia: item.unitPrice || 0,
            thanhTien: item.total || 0,
        }))
    };
    await set(ref(database, `${PORTS.PROCESSING_TICKETS}/${key}`), firebaseData);
  },
  deleteProcessingTicket: async (key: string): Promise<void> => {
    if (!key) throw new Error("Lỗi: Mã phiếu không hợp lệ để xóa.");
    await remove(ref(database, `${PORTS.PROCESSING_TICKETS}/${key}`));
  },

  // --- Debt Summaries (Đối Soát Công Nợ) ---
  getDebtSummaries: async (customerId: string): Promise<DebtSummary[]> => {
    try {
        const snapshot = await get(child(dbRef, `${PORTS.DEBT_SUMMARIES}/${customerId}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.keys(data).map(key => ({
                id: key,
                firebaseKey: key,
                ...data[key]
            })).sort((a, b) => b.id.localeCompare(a.id)); // Sort by newest first
        }
        return [];
    } catch (e) {
        console.error("Error getting debt summaries", e);
        return [];
    }
  },

  saveDebtSummary: async (summary: DebtSummary): Promise<void> => {
    const path = `${PORTS.DEBT_SUMMARIES}/${summary.customerId}/${summary.id}`;
    await set(ref(database, path), {
        customerId: summary.customerId,
        customerName: summary.customerName,
        startDate: summary.startDate,
        endDate: summary.endDate,
        openingBalance: summary.openingBalance,
        closingBalance: summary.closingBalance,
        totalNewDebt: summary.totalNewDebt,
        totalPayments: summary.totalPayments,
        transactions: summary.transactions,
        generatedAt: summary.generatedAt,
    });
  },

  deleteDebtSummary: async (customerId: string, summaryId: string): Promise<void> => {
    const path = `${PORTS.DEBT_SUMMARIES}/${customerId}/${summaryId}`;
    await remove(ref(database, path));
  },

  generateDebtSummaryForPeriod: async (customerId: string, year: number, month: number): Promise<DebtSummary> => {
    const [allInvoices, allPayments, customer] = await Promise.all([
        db.getInvoices(),
        db.getAllPayments(),
        db.getCustomers().then(customers => customers.find(c => c.firebaseKey === customerId))
    ]);

    if (!customer) throw new Error("Customer not found");

    // Use UTC to prevent timezone bugs
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1)); // Start of next month
    endDate.setUTCMilliseconds(endDate.getUTCMilliseconds() - 1); // End of current month

    const startDateStr = formatDateToYYYYMMDD(startDate);
    const endDateStr = formatDateToYYYYMMDD(endDate);


    // 1. Calculate Opening Balance
    const previousInvoices = allInvoices.filter(inv => inv.customerId === customerId && safeGetDatePart(inv.date) < startDateStr && inv.paymentType === 'cong_no');
    const previousPayments = allPayments.filter(p => p.customerId === customerId && safeGetDatePart(p.date) < startDateStr);
    
    // Correct Opening Balance
    let openingBalance = previousInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    previousPayments.forEach(p => {
        openingBalance += (p.type === 'payment' ? -p.amount : p.amount);
    });

    // 2. Get Transactions for the Period
    const periodInvoices = allInvoices.filter(inv => inv.customerId === customerId && safeGetDatePart(inv.date) >= startDateStr && safeGetDatePart(inv.date) <= endDateStr && inv.paymentType === 'cong_no');
    const periodPayments = allPayments.filter(p => p.customerId === customerId && safeGetDatePart(p.date) >= startDateStr && safeGetDatePart(p.date) <= endDateStr);

    const invoiceTransactions: DebtSummaryTransaction[] = periodInvoices.map(inv => ({
        date: inv.date,
        type: 'invoice',
        description: `Hóa đơn #${inv.id}`,
        amount: inv.totalAmount,
        balanceChange: inv.totalAmount
    }));

    const paymentTransactions: DebtSummaryTransaction[] = periodPayments.map(p => ({
        date: p.date,
        type: p.type === 'payment' ? 'payment' : 'adjustment',
        description: p.note || (p.type === 'payment' ? `Thanh toán (${p.method})` : 'Điều chỉnh'),
        amount: p.amount,
        balanceChange: p.type === 'payment' ? -p.amount : p.amount
    }));

    const transactions = [...invoiceTransactions, ...paymentTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // 3. Calculate Totals
    const totalNewDebt = periodInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPayments = periodPayments.filter(p => p.type === 'payment').reduce((sum, p) => sum + p.amount, 0);
    const closingBalance = openingBalance + transactions.reduce((sum, t) => sum + t.balanceChange, 0);

    return {
        id: `${year}-${String(month).padStart(2, '0')}`,
        customerId: customerId,
        customerName: customer.name,
        startDate: startDateStr,
        endDate: endDateStr,
        openingBalance: openingBalance,
        closingBalance: closingBalance,
        totalNewDebt: totalNewDebt,
        totalPayments: totalPayments,
        transactions: transactions,
        generatedAt: new Date().toISOString()
    };
  }
};
