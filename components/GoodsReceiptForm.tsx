import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Truck, Search, Building2, MapPin, Phone, Calendar, StickyNote } from 'lucide-react';
import { GoodsReceiptNote, GoodsReceiptItem, Agency, ProductItem } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
  onSave: () => void;
  existingNote?: GoodsReceiptNote | null;
}

export const GoodsReceiptForm: React.FC<Props> = ({ onClose, onSave, existingNote }) => {
  const { showToast } = useToast();

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  const [noteId, setNoteId] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [agencyNameInput, setAgencyNameInput] = useState('');
  
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);

  const [items, setItems] = useState<GoodsReceiptItem[]>([]);
  const [paymentType, setPaymentType] = useState<'tien_mat' | 'cong_no'>('cong_no');
  const [note, setNote] = useState('');
  
  const [createdBy, setCreatedBy] = useState('Admin');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [receivedBy, setReceivedBy] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [a, p] = await Promise.all([db.getAgencies(), db.getProducts()]);
      setAgencies(a);
      setProducts(p);

      if (existingNote) {
        setNoteId(existingNote.id);
        setSelectedAgencyId(existingNote.agencyId);
        setAgencyNameInput(existingNote.agencyName);
        setNoteDate((existingNote.date || '').split('T')[0]);
        setItems(existingNote.items || []);
        setPaymentType(existingNote.paymentType);
        setNote(existingNote.note || '');
        setCreatedBy(existingNote.createdBy);
        setDeliveredBy(existingNote.deliveredBy || '');
        setReceivedBy(existingNote.receivedBy || '');
      } else {
        const nextId = await db.getNextGoodsReceiptNoteCode();
        setNoteId(nextId);
        addItem();
      }
    };
    fetchData();
  }, [existingNote]);

  const handleAgencyChange = (name: string) => {
    setAgencyNameInput(name);
    const found = agencies.find(a => a.name.toLowerCase() === name.toLowerCase());
    if (found) {
        setSelectedAgencyId(found.firebaseKey || found.id);
    } else {
        setSelectedAgencyId('');
    }
  };

  const calculateItem = (item: GoodsReceiptItem): GoodsReceiptItem => {
    const qty = (item.packs || 0) * (item.sheetsPerPack || 0);
    const area = ((item.hs1 || 0) * (item.hs2 || 0) * qty) / 1000000;
    const total = area * (item.unitPrice || 0);
    return { ...item, quantity: qty, total: Math.round(total) };
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: '', hs1: 0, hs2: 0, unit: 'tấm', packs: 0, sheetsPerPack: 0, quantity: 0, unitPrice: 0, total: 0
    }]);
  };

  const updateItem = (index: number, field: keyof GoodsReceiptItem, value: any) => {
    const newItems = [...items];
    let updatedItem = { ...newItems[index], [field]: value };
    updatedItem = calculateItem(updatedItem);
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const getTotal = () => items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleSave = async () => {
    if (!selectedAgencyId && !agencyNameInput) { showToast('Vui lòng chọn hoặc nhập tên đại lý', 'error'); return; }
    if (items.length === 0 || items.every(i => !i.description)) { showToast('Vui lòng thêm ít nhất một mặt hàng', 'error'); return; }

    const finalAgencyName = agencyNameInput || (agencies.find(a => a.firebaseKey === selectedAgencyId)?.name || '');

    const finalNote: GoodsReceiptNote = {
      id: noteId,
      firebaseKey: existingNote?.firebaseKey,
      agencyId: selectedAgencyId || `temp_${Date.now()}`,
      agencyName: finalAgencyName,
      date: noteDate,
      items,
      totalAmount: getTotal(),
      paymentType,
      note,
      createdBy,
      deliveredBy,
      receivedBy
    };
    
    await db.saveGoodsReceiptNote(finalNote, existingNote);
    showToast('Lưu phiếu nhập thành công!', 'success');
    onSave();
  };
  
  const productOptions = products.map(p => p.name);
  const totalQuantity = items.reduce((s, i) => s + (i.quantity || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 overflow-y-auto py-10">
      <div className="bg-white w-[95%] max-w-[1200px] rounded-3xl shadow-2xl flex flex-col max-h-[95vh]">
        <div className="px-8 py-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-green-600 to-green-500 rounded-t-3xl text-white">
          <h2 className="text-2xl font-bold flex items-center">
            <Truck className="mr-3" />
            {existingNote ? 'Sửa Phiếu Nhập Hàng' : 'Tạo Phiếu Nhập Hàng Mới'}
          </h2>
          <div className="flex items-center gap-4">
              <div className="bg-white/20 px-4 py-1 rounded-full text-sm font-mono font-bold">
                  ID: {noteId}
              </div>
              <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border col-span-2 space-y-2">
                <label className="block text-sm font-bold text-green-900 flex items-center"><Building2 size={16} className="mr-2" /> Đại lý / Nhà Cung Cấp</label>
                <datalist id="agencyList">{agencies.map(a => <option key={a.id} value={a.name} />)}</datalist>
                <div className="relative">
                  <input list="agencyList" type="text" className="w-full p-2 pl-8 rounded-lg border border-slate-200 focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none font-bold text-slate-700" placeholder="Nhập tên đại lý..." value={agencyNameInput} onChange={(e) => handleAgencyChange(e.target.value)} />
                   <Search className="absolute left-2 top-2.5 text-slate-400" size={16} />
                </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border space-y-2">
                <label className="block text-sm font-bold text-green-900 mb-1">Ngày Nhập</label>
                <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} className="w-full p-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border">
            <datalist id="productList">{productOptions.map((name, i) => <option key={i} value={name} />)}</datalist>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead className="bg-green-50 text-green-800 font-semibold">
                      <tr>
                          <th className="p-2 min-w-[200px] text-left">Tên Hàng</th>
                          <th className="p-2 w-24">HS1 (mm)</th>
                          <th className="p-2 w-24">HS2 (mm)</th>
                          <th className="p-2 w-24">ĐVT</th>
                          <th className="p-2 w-24">Tấm/Kiện</th>
                          <th className="p-2 w-24">Số Kiện</th>
                          <th className="p-2 w-24 text-center">Tổng Tấm</th>
                          <th className="p-2 w-32 text-right">Đơn giá</th>
                          <th className="p-2 w-32 text-right">Thành tiền</th>
                          <th className="p-2 w-8"></th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {items.map((item, index) => (
                          <tr key={item.id} className={`group transition-colors ${index % 2 === 1 ? 'bg-slate-50' : 'bg-white hover:bg-green-50/50'}`}>
                              <td className="p-1"><input list="productList" type="text" value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} className="w-full p-1.5 rounded border bg-transparent" /></td>
                              <td className="p-1"><input type="number" value={item.hs1 || ''} onChange={e => updateItem(index, 'hs1', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" /></td>
                              <td className="p-1"><input type="number" value={item.hs2 || ''} onChange={e => updateItem(index, 'hs2', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" /></td>
                              <td className="p-1"><input type="text" value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)} className="w-full p-1.5 rounded border text-center bg-transparent" /></td>
                              <td className="p-1"><input type="number" value={item.sheetsPerPack || ''} onChange={e => updateItem(index, 'sheetsPerPack', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" /></td>
                              <td className="p-1"><input type="number" value={item.packs || ''} onChange={e => updateItem(index, 'packs', Number(e.target.value))} className="w-full p-1.5 rounded border text-center bg-transparent" /></td>
                              <td className="p-1 text-center font-bold text-slate-600">{item.quantity}</td>
                              <td className="p-1"><input type="number" value={item.unitPrice || ''} onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))} className="w-full p-1.5 rounded border text-right bg-transparent" /></td>
                              <td className="p-1 text-right font-bold text-green-700">{(item.total || 0).toLocaleString()}</td>
                              <td className="p-1 text-center"><button onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                          </tr>
                      ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold text-slate-800">
                      <tr className="border-t-2">
                          <td className="p-2 text-right uppercase" colSpan={6}>Tổng cộng:</td>
                          <td className="p-2 text-center text-blue-700">{totalQuantity}</td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right text-green-800">{getTotal().toLocaleString()}đ</td>
                          <td></td>
                      </tr>
                  </tfoot>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
                <button onClick={addItem} className="flex items-center text-green-600 font-bold hover:text-green-700 transition text-sm"><Plus size={18} className="mr-1" /> Thêm dòng</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
            <div className="w-full space-y-4">
               <input type="text" placeholder="Người lập phiếu..." value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="w-full p-2 border rounded-lg" />
               <input type="text" placeholder="Người giao..." value={deliveredBy} onChange={e => setDeliveredBy(e.target.value)} className="w-full p-2 border rounded-lg" />
               <input type="text" placeholder="Người nhận..." value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className="w-full p-2 border rounded-lg" />
               <textarea placeholder="Ghi chú cho phiếu nhập..." value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 border rounded-lg h-24 resize-none"></textarea>
            </div>
            <div className="w-full bg-white p-6 rounded-2xl shadow-sm border">
               <h3 className="font-bold text-lg mb-4 text-green-900">Thanh Toán</h3>
               <div className="flex gap-2 mb-4">
                    <label className="flex-1 p-2 border rounded-lg cursor-pointer flex items-center hover:bg-slate-50"><input type="radio" name="paymentType" checked={paymentType === 'cong_no'} onChange={() => setPaymentType('cong_no')} className="w-4 h-4 text-red-600 mr-2" /> <span className="font-medium">Công Nợ</span></label>
                    <label className="flex-1 p-2 border rounded-lg cursor-pointer flex items-center hover:bg-slate-50"><input type="radio" name="paymentType" checked={paymentType === 'tien_mat'} onChange={() => setPaymentType('tien_mat')} className="w-4 h-4 text-green-600 mr-2" /> <span className="font-medium">Tiền Mặt</span></label>
               </div>
               <div className="flex justify-between items-center font-bold text-xl text-green-800 border-t border-dashed pt-4 mt-4">
                 <span>TỔNG CỘNG:</span>
                 <span>{getTotal().toLocaleString()}đ</span>
               </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t bg-white rounded-b-3xl flex justify-end gap-4">
          <button onClick={onClose} className="px-6 py-3 rounded-full text-slate-500 hover:bg-slate-100 font-bold transition">Hủy bỏ</button>
          <button onClick={handleSave} className="px-8 py-3 rounded-full bg-green-600 text-white font-bold shadow-lg shadow-green-500/30 hover:bg-green-700 transition flex items-center">
             <Save size={20} className="mr-2" /> Lưu Phiếu Nhập
          </button>
        </div>
      </div>
    </div>
  );
};
