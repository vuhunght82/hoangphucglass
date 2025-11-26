import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Calculator, Search, User, MapPin, Phone, Calendar, StickyNote, Settings, Tag, QrCode } from 'lucide-react';
import { Invoice, InvoiceItem, Customer, Employee, GrindingType, ProductItem, PriceRule } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';

interface Props {
  formId: string;
  onClose: () => void;
  onMinimize: () => void;
  onSave: (savedInvoiceId: string) => void;
  existingInvoice?: Invoice | null;
}

export const InvoiceForm: React.FC<Props> = ({ formId, onClose, onMinimize, onSave, existingInvoice }) => {
  const { showToast } = useToast();
  const inputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [grindingTypes, setGrindingTypes] = useState<GrindingType[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productAttributes, setProductAttributes] = useState<string[]>([]);
  
  // Form State
  const [invoiceId, setInvoiceId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState(''); // For searching
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryDate, setDeliveryDate] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [transportFee, setTransportFee] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState<'tien_mat' | 'cong_no'>('cong_no');
  const [status, setStatus] = useState<Invoice['status']>('chua_giao');
  const [paymentStatus, setPaymentStatus] = useState<Invoice['paymentStatus']>('chua_thanh_toan');
  const [deliveryBy, setDeliveryBy] = useState('');
  const [createdBy, setCreatedBy] = useState('Admin');
  const [note, setNote] = useState('');
  const [qrCodeContent, setQrCodeContent] = useState('');

  // Toggle state for keeping processing settings when adding rows
  const [keepSettings, setKeepSettings] = useState(false);

  const safeGetDatePart = (dateStr: string | undefined | null) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    return dateStr.split('T')[0];
  }

  useEffect(() => {
    const fetchData = async () => {
      const [c, e, g, p, s] = await Promise.all([
        db.getCustomers(),
        db.getEmployees(),
        db.getGrindingSettings(),
        db.getProducts(),
        db.getAppSettings()
      ]);
      setCustomers(c);
      setEmployees(e);
      setGrindingTypes(g);
      setProducts(p);
      setProductAttributes(s.productAttributes || []);

      if (existingInvoice) {
        setInvoiceId(existingInvoice.id);
        setSelectedCustomerId(existingInvoice.customerId);
        setCustomerNameInput(existingInvoice.customerName);
        setCustomerAddress(existingInvoice.customerAddress);
        setCustomerPhone(existingInvoice.customerPhone);
        setInvoiceDate(safeGetDatePart(existingInvoice.date));
        setDeliveryDate(safeGetDatePart(existingInvoice.deliveryDate));
        setItems(existingInvoice.items || []);
        setTransportFee(existingInvoice.transportFee || 0);
        setDeposit(existingInvoice.deposit || 0);
        setDiscount(existingInvoice.discount || 0);
        setPaymentType(existingInvoice.paymentType || 'cong_no');
        setStatus(existingInvoice.status || 'chua_giao');
        setPaymentStatus(existingInvoice.paymentStatus || 'chua_thanh_toan');
        setDeliveryBy(existingInvoice.deliveryBy || '');
        setCreatedBy(existingInvoice.createdBy || 'Admin');
        setNote(existingInvoice.note || '');
        setQrCodeContent(existingInvoice.qrCodeContent || '');
      } else {
        const nextId = await db.getNextInvoiceId();
        setInvoiceId(nextId);
        addItem(true);
      }
    };
    fetchData();
  }, [existingInvoice]);

  const handleCustomerChange = (name: string) => {
    setCustomerNameInput(name);
    if (!name) {
        setSelectedCustomerId('');
        return;
    }
    
    const searchName = name.toLowerCase();
    const foundCustomer = customers.find(c => 
        (c.name || '').toLowerCase() === searchName || 
        (c.code && c.code.toLowerCase() === searchName)
    );
    
    if (foundCustomer) {
        setSelectedCustomerId(foundCustomer.firebaseKey || foundCustomer.id);
        setCustomerAddress(foundCustomer.address);
        setCustomerPhone(foundCustomer.phone);
        if (foundCustomer.paymentMode) setPaymentType(foundCustomer.paymentMode);
    } else {
        setSelectedCustomerId('');
    }
  };

  const handleApplyPriceRule = async (index: number) => {
    const item = items[index];
    if (!item.productCode) {
        showToast("Sản phẩm không hợp lệ hoặc không có mã. Vui lòng chọn lại từ danh sách.", "info");
        return;
    }
    
    const isTempered = (item.description || '').toLowerCase().includes('c.lực');
    const rule = await db.getApplicablePriceRule(item.productCode, selectedCustomerId);

    if (rule) {
        const newItems = [...items];
        let updatedItem = { ...newItems[index] };

        updatedItem.unitPrice = (isTempered && rule.temperedGlassPrice) ? rule.temperedGlassPrice : rule.glassPrice;
        updatedItem.grindingUnitPrice = rule.grindingPrice;
        updatedItem.drillUnitPrice = rule.drillPrice;
        updatedItem.cutoutUnitPrice = rule.cutoutPrice;
        
        newItems[index] = calculateItem(updatedItem);
        setItems(newItems);
        showToast(`Đã áp dụng giá niêm yết cho "${item.description}"`, 'success');
    } else {
        showToast(`Không tìm thấy giá niêm yết cho "${item.description}"`, 'error');
    }
  };

  const calculateItem = (item: InvoiceItem): InvoiceItem => {
    const h = item.height || 0;
    const w = item.width || 0;
    const qty = item.quantity || 0;
    const area = (h * w * qty) / 1000000;
    
    let grindingLen = 0;
    const perimeter = (h + w) * 2;
    switch (item.grindingType) {
      case '4c': grindingLen = (perimeter * qty) / 1000; break;
      case '2d': grindingLen = (Math.max(h, w) * 2 * qty) / 1000; break;
      case '2n': grindingLen = (Math.min(h, w) * 2 * qty) / 1000; break;
      case '1d': grindingLen = (Math.max(h, w) * qty) / 1000; break;
      case '1n': grindingLen = (Math.min(h, w) * qty) / 1000; break;
      default: grindingLen = 0;
    }

    let gUnitPrice = item.grindingUnitPrice || 0;
    if (item.grindingType !== 'none' && gUnitPrice === 0) {
         const gType = grindingTypes.find(g => g.code === item.grindingType);
         if (gType) gUnitPrice = gType.pricePerMeter;
    }

    const grindingCost = grindingLen * gUnitPrice;
    const drillCost = (item.drillHoles || 0) * (item.drillUnitPrice || 0);
    const cutoutCost = (item.cutouts || 0) * (item.cutoutUnitPrice || 0);
    const glassCost = area * (item.unitPrice || 0);
    const total = glassCost + grindingCost + drillCost + cutoutCost;

    return {
      ...item, area: parseFloat(area.toFixed(3)), grindingLength: parseFloat(grindingLen.toFixed(3)),
      grindingUnitPrice: gUnitPrice, grindingPrice: parseFloat(grindingCost.toFixed(0)),
      drillPrice: parseFloat(drillCost.toFixed(0)), cutoutPrice: parseFloat(cutoutCost.toFixed(0)),
      total: parseFloat(total.toFixed(0))
    };
  };

  const addItem = (isInit = false) => {
    let baseItem: Partial<InvoiceItem> = {
        description: '', unitPrice: 0, productCode: undefined,
        grindingType: 'none', grindingUnitPrice: 0,
        drillHoles: 0, drillUnitPrice: 5000,
        cutouts: 0, cutoutUnitPrice: 50000,
    };

    if (!isInit && items.length > 0) {
        const lastItem = items[items.length - 1];
        baseItem.description = lastItem.description;
        baseItem.productCode = lastItem.productCode;
        baseItem.unitPrice = lastItem.unitPrice;
        
        if (keepSettings) {
            baseItem.grindingType = lastItem.grindingType;
            baseItem.grindingUnitPrice = lastItem.grindingUnitPrice;
            baseItem.drillHoles = lastItem.drillHoles;
            baseItem.drillUnitPrice = lastItem.drillUnitPrice;
            baseItem.cutouts = lastItem.cutouts;
            baseItem.cutoutUnitPrice = lastItem.cutoutUnitPrice;
        }
    }

    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: baseItem.description!, width: 0, height: 0, quantity: 1, area: 0,
      grindingType: baseItem.grindingType!, grindingLength: 0, grindingUnitPrice: baseItem.grindingUnitPrice!, grindingPrice: 0,
      drillHoles: baseItem.drillHoles!, drillUnitPrice: baseItem.drillUnitPrice!, drillPrice: 0,
      cutouts: baseItem.cutouts!, cutoutUnitPrice: baseItem.cutoutUnitPrice!, cutoutPrice: 0,
      unitPrice: baseItem.unitPrice!, total: 0, productCode: baseItem.productCode
    }]);
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    let updatedItem: InvoiceItem = { ...newItems[index], [field]: value };
    
    if (field === 'grindingType') updatedItem.grindingUnitPrice = 0;
    
    updatedItem = calculateItem(updatedItem);
    newItems[index] = updatedItem;
    setItems(newItems);
  };
  
  const handleDescriptionChange = (index: number, description: string) => {
    const newItems = [...items];
    let updatedItem = { ...newItems[index], description };
    const matchingProduct = products.find(p => p.name === description);
    updatedItem.productCode = matchingProduct?.code;
    newItems[index] = updatedItem;
    setItems(newItems);
  };
  
  const toggleAttribute = (index: number, attr: string) => {
      const currentItem = items[index];
      const currentDesc = currentItem.description || '';

      // Extract base product name by removing any existing parenthesized attributes
      const baseProductName = currentDesc.split(' (')[0].trim();

      // Check if the base product name is a valid product from the list
      if (!baseProductName || !products.some(p => p.name === baseProductName)) {
        showToast("Vui lòng chọn một sản phẩm gốc từ danh sách trước.", "info");
        return;
      }

      // Rebuild the description string starting with the base product name
      let newDesc = baseProductName;
      
      // Find all attributes that are currently in the description
      const existingAttributes = productAttributes.filter(pa => currentDesc.includes(` (${pa})`));

      // Toggle the clicked attribute
      let updatedAttributes: string[];
      if (existingAttributes.includes(attr)) {
          // If it's present, remove it
          updatedAttributes = existingAttributes.filter(a => a !== attr);
      } else {
          // If not present, add it
          updatedAttributes = [...existingAttributes, attr];
      }
      
      // Sort the updated attributes based on the original productAttributes order to ensure consistency
      const sortedUpdatedAttributes = productAttributes.filter(pa => updatedAttributes.includes(pa));

      // Append all active attributes to the base name
      sortedUpdatedAttributes.forEach(a => {
          newDesc += ` (${a})`;
      });

      updateItem(index, 'description', newDesc);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const getTotal = () => items.reduce((sum, item) => sum + (item.total || 0), 0) + (transportFee || 0) - (discount || 0);

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          const nextIndex = index + 1;
          if (nextIndex >= items.length) {
              addItem();
              setTimeout(() => inputRefs.current[`${nextIndex}-${field}`]?.focus(), 50);
          } else {
              inputRefs.current[`${nextIndex}-${field}`]?.focus();
              inputRefs.current[`${nextIndex}-${field}`]?.select();
          }
      }
  };

  const handlePaymentStatusChange = (status: Invoice['paymentStatus']) => {
    setPaymentStatus(status);
    if(status === 'da_chuyen_khoan' || status === 'da_tra_tien_mat') {
        setDeposit(getTotal());
    }
  };

  const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);
  const totalM2 = items.reduce((s, i) => s + (i.area || 0), 0);
  const totalGrindingLength = items.reduce((s, i) => s + (i.grindingLength || 0), 0);
  const totalHoles = items.reduce((s, i) => s + (i.drillHoles || 0), 0);
  const totalCutouts = items.reduce((s, i) => s + (i.cutouts || 0), 0);

  const handleSave = async () => {
    if (!customerNameInput) { showToast('Vui lòng nhập tên khách hàng', 'error'); return; }
    if (items.length === 0) { showToast('Vui lòng thêm sản phẩm', 'error'); return; }

    const total = getTotal();
    const remaining = total - deposit;

    if (paymentType === 'cong_no' && selectedCustomerId) {
        const customer = customers.find(c => (c.firebaseKey || c.id) === selectedCustomerId);
        if (customer && customer.debtLimit && customer.debtLimit > 0) {
            const currentDebt = customer.currentDebt || 0;
            const existingInvoiceDebtContribution = (existingInvoice && existingInvoice.paymentType === 'cong_no') ? (existingInvoice.remainingAmount || 0) : 0;
            const projectedTotalDebt = currentDebt - existingInvoiceDebtContribution + remaining;
            if (projectedTotalDebt > customer.debtLimit) {
                showToast(`Công nợ mới (${projectedTotalDebt.toLocaleString()}đ) vượt hạn mức (${customer.debtLimit.toLocaleString()}đ).`, 'error');
                return;
            }
        }
    }

    const finalInvoiceId = existingInvoice ? existingInvoice.id : invoiceId;
    const invoice: Invoice = {
      id: finalInvoiceId, firebaseKey: existingInvoice?.firebaseKey, customerId: selectedCustomerId || `temp_${Date.now()}`,
      customerName: customerNameInput, customerAddress, customerPhone, date: invoiceDate, deliveryDate: deliveryDate || undefined, items,
      subTotal: items.reduce((sum, item) => sum + (item.total || 0), 0),
      transportFee, discount, deposit, totalAmount: total, remainingAmount: remaining,
      paymentType, status, paymentStatus, createdBy, deliveryBy: deliveryBy || undefined, note, qrCodeContent,
    };

    await db.saveInvoice(invoice, existingInvoice);
    showToast('Lưu hóa đơn thành công!', 'success');
    onSave(finalInvoiceId);
  };

  return (
    <div className="fixed bottom-12 right-4 z-50 flex items-end justify-end no-print">
      <div className="fixed inset-0 -z-10" onClick={onMinimize}></div>
      <div className="bg-white w-[95vw] max-w-[1400px] rounded-t-2xl shadow-2xl flex flex-col h-[calc(100vh-8rem)]">
        <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl text-white">
          <h2 className="text-2xl font-bold flex items-center"><Calculator className="mr-3" />{existingInvoice ? 'Sửa Hóa Đơn' : 'Tạo Hóa Đơn Mới'}</h2>
          <div className="flex items-center gap-2">
              <div className="bg-white/20 px-4 py-1 rounded-full text-sm font-mono font-bold">ID: {invoiceId}</div>
              <button onClick={onMinimize} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition font-bold text-lg leading-none pb-1.5" title="Thu nhỏ">−</button>
              <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition" title="Đóng">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <datalist id="invoiceProductList">{products.map(p => <option key={p.id} value={p.name} />)}</datalist>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-4 rounded-2xl shadow-sm border col-span-2 space-y-3">
                  <label className="text-sm font-bold text-blue-900 flex items-center"><User size={16} className="mr-2"/> Thông Tin Khách Hàng</label>
                  <datalist id="customerList">{customers.map(c => <option key={c.id} value={c.name} />)}</datalist>
                  <div className="relative"><Search size={16} className="absolute left-2.5 top-2.5 text-slate-400" /><input list="customerList" type="text" placeholder="Tìm hoặc nhập tên khách hàng..." value={customerNameInput} onChange={(e) => handleCustomerChange(e.target.value)} className="w-full pl-8 p-2 rounded-lg border font-bold" /></div>
                  <div className="relative"><MapPin size={16} className="absolute left-2.5 top-2.5 text-slate-400" /><input type="text" placeholder="Địa chỉ" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full pl-8 p-2 rounded-lg border" /></div>
                  <div className="relative"><Phone size={16} className="absolute left-2.5 top-2.5 text-slate-400" /><input type="text" placeholder="Số điện thoại" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full pl-8 p-2 rounded-lg border" /></div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-3">
                  <label className="text-sm font-bold text-blue-900 flex items-center"><Calendar size={16} className="mr-2"/> Ngày Tháng</label>
                  <label className="text-xs font-medium">Ngày lập HĐ</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                  <label className="text-xs font-medium">Ngày giao</label>
                  <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="w-full p-2 border rounded-lg" />
              </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 text-blue-800 font-semibold sticky top-0 z-10">
                        <tr>
                            <th className="p-2 text-left min-w-[200px]">Tên Hàng</th><th className="p-2 w-24">Cao (mm)</th><th className="p-2 w-24">Rộng (mm)</th><th className="p-2 w-16">SL</th><th className="p-2 w-20">M2</th><th className="p-2 w-28">Mài (*)</th><th className="p-2 w-28">m Mài</th><th className="p-2 w-16">Khoan</th><th className="p-2 w-28">Đ.Giá Khoan (*)</th><th className="p-2 w-16">Khoét</th><th className="p-2 w-28">Đ.Giá Khoét (*)</th><th className="p-2 w-32">Đơn Giá Kính (*)</th><th className="p-2 w-32">Thành Tiền</th><th className="p-2 w-8"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {items.map((item, index) => (
                            <tr key={item.id} className="group transition-colors hover:bg-blue-50/50">
                                <td className="p-1 align-top">
                                    <div className="flex items-center">
                                      <input list="invoiceProductList" type="text" value={item.description || ''} onChange={e => handleDescriptionChange(index, e.target.value)} className="w-full p-1.5 rounded border bg-transparent focus:border-blue-500 outline-none" placeholder="-- Chọn/nhập tên hàng --" ref={el => { inputRefs.current[`${index}-description`] = el; }} />
                                      <button onClick={() => handleApplyPriceRule(index)} className="ml-1 p-1.5 text-slate-400 hover:text-blue-600" title="Lấy giá niêm yết"><Tag size={16}/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {productAttributes.map(attr => (<button key={attr} onClick={() => toggleAttribute(index, attr)} className={`px-1.5 py-0.5 rounded text-[10px] border transition ${(item.description || '').includes(`(${attr})`) ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}>{attr}</button>))}
                                    </div>
                                </td>
                                <td className="p-1"><input type="number" value={item.height || ''} onChange={e => updateItem(index, 'height', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" onKeyDown={(e) => handleKeyDown(e, index, 'height')} ref={el => { inputRefs.current[`${index}-height`] = el; }}/></td>
                                <td className="p-1"><input type="number" value={item.width || ''} onChange={e => updateItem(index, 'width', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" onKeyDown={(e) => handleKeyDown(e, index, 'width')} ref={el => { inputRefs.current[`${index}-width`] = el; }}/></td>
                                <td className="p-1"><input type="number" value={item.quantity || ''} onChange={e => updateItem(index, 'quantity', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent font-bold" onKeyDown={(e) => handleKeyDown(e, index, 'quantity')} ref={el => { inputRefs.current[`${index}-quantity`] = el; }}/></td>
                                <td className="p-1 text-center font-medium text-slate-600">{item.area.toFixed(3)}</td>
                                <td className="p-1">
                                    <select value={item.grindingType} onChange={e => updateItem(index, 'grindingType', e.target.value)} className="w-full p-1.5 rounded border bg-transparent">{grindingTypes.map(g => <option key={g.id} value={g.code}>{g.name}</option>)}</select>
                                    <input type="number" placeholder="Đ.giá mài" value={(item.grindingUnitPrice || 0) === 0 ? '' : item.grindingUnitPrice / 1000} onChange={e => updateItem(index, 'grindingUnitPrice', Number(e.target.value) * 1000)} className="w-full p-1.5 mt-1 rounded border text-right bg-transparent text-xs"/>
                                </td>
                                <td className="p-1 text-center font-medium text-slate-600">{(item.grindingLength || 0).toFixed(3)}</td>
                                <td className="p-1"><input type="number" placeholder="Số lỗ" value={item.drillHoles || ''} onChange={e => updateItem(index, 'drillHoles', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent"/></td>
                                <td className="p-1"><input type="number" value={(item.drillUnitPrice || 0) === 0 ? '' : item.drillUnitPrice / 1000} onChange={e => updateItem(index, 'drillUnitPrice', Number(e.target.value) * 1000)} className="w-full p-1.5 rounded border text-right bg-transparent"/></td>
                                <td className="p-1"><input type="number" placeholder="Số khoét" value={item.cutouts || ''} onChange={e => updateItem(index, 'cutouts', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent"/></td>
                                <td className="p-1"><input type="number" value={(item.cutoutUnitPrice || 0) === 0 ? '' : item.cutoutUnitPrice / 1000} onChange={e => updateItem(index, 'cutoutUnitPrice', Number(e.target.value) * 1000)} className="w-full p-1.5 rounded border text-right bg-transparent"/></td>
                                <td className="p-1"><input type="number" value={(item.unitPrice || 0) === 0 ? '' : (item.unitPrice || 0) / 1000} onChange={e => updateItem(index, 'unitPrice', Number(e.target.value) * 1000)} className="w-full p-1.5 rounded border text-right bg-transparent"/></td>
                                <td className="p-1 text-right font-bold text-blue-700">{(item.total || 0).toLocaleString()}</td>
                                <td className="p-1 text-center"><button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 opacity-50 group-hover:opacity-100 transition"><Trash2 size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold text-slate-800">
                        <tr className="border-t-2"><td className="p-2 text-right uppercase" colSpan={3}>Tổng cộng:</td><td className="p-2 text-center text-blue-700">{totalQuantity}</td><td className="p-2 text-center text-blue-700">{totalM2.toFixed(3)}</td><td className="p-2"></td><td className="p-2 text-center text-blue-700">{totalGrindingLength.toFixed(3)}</td><td className="p-2 text-center text-blue-700">{totalHoles}</td><td className="p-2"></td><td className="p-2 text-center text-blue-700">{totalCutouts}</td><td className="p-2"></td><td className="p-2"></td><td className="p-2 text-right text-blue-800 text-base">{items.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}đ</td><td></td></tr>
                    </tfoot>
                </table>
              </div>
              <div className="p-3 bg-slate-50 border-t flex justify-between items-center"><div className="flex items-center"><input type="checkbox" id="keepSettings" checked={keepSettings} onChange={(e) => setKeepSettings(e.target.checked)} className="w-4 h-4 mr-2" /><label htmlFor="keepSettings" className="text-xs font-medium text-slate-600">Giữ cài đặt gia công</label></div><button onClick={() => addItem(false)} className="flex items-center text-blue-600 font-bold hover:text-blue-700 transition text-sm"><Plus size={18} className="mr-1"/> Thêm dòng</button></div>
               <div className="p-2 text-center text-xs text-slate-500 bg-slate-100 border-t">(*) Đơn giá được tính theo hệ số 1000 (ví dụ: nhập 100 sẽ thành 100.000đ).</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
              <div className="w-full space-y-3">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border">
                      <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center"><Settings size={16} className="mr-2"/> Tùy chọn hóa đơn</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium">Trạng thái đơn hàng</label>
                            <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full p-2 border rounded-lg text-sm mt-1"><option value="chua_giao">Chưa giao</option><option value="da_cat">Đã cắt</option><option value="da_giao">Đã giao</option></select>
                        </div>
                        <div>
                            <label className="text-xs font-medium">Trạng thái thanh toán</label>
                            <select value={paymentStatus} onChange={e => handlePaymentStatusChange(e.target.value as any)} className="w-full p-2 border rounded-lg text-sm mt-1"><option value="chua_thanh_toan">Chưa thanh toán</option><option value="thanh_toan_mot_phan">Thanh toán 1 phần</option><option value="da_chuyen_khoan">Đã chuyển khoản</option><option value="da_tra_tien_mat">Đã trả tiền mặt</option></select>
                        </div>
                        <input type="text" placeholder="Người lập..." value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="w-full p-2 border rounded-lg text-sm" /><input type="text" placeholder="Người giao..." value={deliveryBy} onChange={e => setDeliveryBy(e.target.value)} className="w-full p-2 border rounded-lg text-sm" />
                      </div>
                      <div className="mt-3">
                        <label className="text-xs font-medium flex items-center"><QrCode size={14} className="mr-1.5"/>Nội dung QR Code</label>
                        <input type="text" placeholder="Link VietQR, text..." value={qrCodeContent} onChange={e => setQrCodeContent(e.target.value)} className="w-full p-2 border rounded-lg text-sm mt-1" />
                      </div>
                  </div>
                   <div className="bg-white p-4 rounded-2xl shadow-sm border"><label className="text-sm font-bold text-blue-900 mb-2 flex items-center"><StickyNote size={16} className="mr-2"/> Ghi chú</label><textarea placeholder="Ghi chú cho hóa đơn..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 border rounded-lg h-24 resize-none text-sm"></textarea></div>
              </div>
              <div className="w-full bg-white p-6 rounded-2xl shadow-sm border">
                  <h3 className="font-bold text-lg mb-4 text-blue-900">Thanh Toán</h3>
                  <div className="flex gap-2 mb-4"><label className="flex-1 p-2 border rounded-lg cursor-pointer flex items-center hover:bg-slate-50"><input type="radio" name="paymentType" checked={paymentType === 'cong_no'} onChange={() => setPaymentType('cong_no')} className="w-4 h-4 text-orange-600 mr-2" /> Công Nợ</label><label className="flex-1 p-2 border rounded-lg cursor-pointer flex items-center hover:bg-slate-50"><input type="radio" name="paymentType" checked={paymentType === 'tien_mat'} onChange={() => setPaymentType('tien_mat')} className="w-4 h-4 text-green-600 mr-2" /> Tiền Mặt</label></div>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center"><span className="text-slate-500">Tiền hàng:</span><span className="font-semibold">{items.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}đ</span></div>
                      <div className="flex justify-between items-center"><label className="text-slate-500">Tiền xe:</label><input type="number" value={transportFee} onChange={e => setTransportFee(Number(e.target.value))} className="w-32 p-1 border rounded-md text-right font-semibold" /></div>
                      <div className="flex justify-between items-center"><label className="text-slate-500">Chiết khấu:</label><input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-32 p-1 border rounded-md text-right font-semibold text-red-500" /></div>
                      <div className="flex justify-between items-center font-bold text-xl text-blue-800 border-t pt-2 mt-2"><span>TỔNG CỘNG:</span><span>{getTotal().toLocaleString()}đ</span></div>
                      <div className="flex justify-between items-center"><label className="text-slate-500">Trả trước:</label><input type="number" value={deposit} onChange={e => setDeposit(Number(e.target.value))} className="w-32 p-1 border rounded-md text-right font-semibold text-green-600" /></div>
                      <div className="flex justify-between items-center font-bold text-xl text-red-600 border-t border-dashed pt-2 mt-2"><span>CÒN LẠI:</span><span>{(getTotal() - deposit).toLocaleString()}đ</span></div>
                  </div>
              </div>
          </div>
        </div>
        <div className="p-6 border-t bg-white rounded-b-2xl flex justify-end gap-4"><button onClick={onMinimize} className="px-6 py-3 rounded-full text-slate-500 hover:bg-slate-100 font-bold transition">Hủy bỏ</button><button onClick={handleSave} className="px-8 py-3 rounded-full bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition flex items-center"><Save size={20} className="mr-2" /> Lưu Hóa Đơn</button></div>
      </div>
    </div>
  );
};