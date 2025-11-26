import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Invoice, InvoiceItem, ProcessingUnit, ProcessingTicket, ProcessingTicketItem } from '../types';
import { Search, ChevronRight, Plus, Trash2, Save, Printer, RefreshCw, X, ChevronLeft } from 'lucide-react';
import { useToast } from './Toast';

interface Props {
  onClose: () => void;
  onSave: () => void;
  existingTicket?: ProcessingTicket | null;
}

export const ProcessingTicketManager: React.FC<Props> = ({ onClose, onSave, existingTicket }) => {
    const { showToast } = useToast();
    const [isPanelVisible, setIsPanelVisible] = useState(true);

    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [filterToday, setFilterToday] = useState(false);
    const [selectedInvoiceItems, setSelectedInvoiceItems] = useState<Set<string>>(new Set());

    const [processingUnits, setProcessingUnits] = useState<ProcessingUnit[]>([]);
    const [ticket, setTicket] = useState<Partial<ProcessingTicket>>({});
    const [ticketItems, setTicketItems] = useState<ProcessingTicketItem[]>([]);
    const [currentItem, setCurrentItem] = useState<Partial<ProcessingTicketItem>>({ quantity: 1 });
    const [processingTypes, setProcessingTypes] = useState<string[]>([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (existingTicket) {
            setTicket(existingTicket);
            setTicketItems(existingTicket.items || []);
        } else {
            handleNewTicket();
        }
    }, [existingTicket]);
    
    const loadInitialData = async () => {
        const [invoices, units, settings] = await Promise.all([db.getInvoices(), db.getProcessingUnits(), db.getAppSettings()]);
        const sortedInvoices = invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllInvoices(sortedInvoices);
        setFilteredInvoices(sortedInvoices);
        setProcessingUnits(units);
        setProcessingTypes(settings.processingUnitTradeGroups || ['Cường lực', 'Mài cạnh', 'Ghép keo', 'Sơn']);
    };
    
    const handleNewTicket = async () => {
        const nextId = await db.getNextProcessingTicketId();
        setTicket({ id: nextId, date: new Date().toISOString().split('T')[0], status: 'new' });
        setTicketItems([]);
    };

    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const results = allInvoices.filter(inv => {
             if (filterToday && (inv.date || '').split('T')[0] !== todayStr) return false;
            if (!invoiceSearch.trim()) return true;
            return inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase());
        });
        setFilteredInvoices(results);
    }, [invoiceSearch, allInvoices, filterToday]);

    const handleSelectInvoice = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setSelectedInvoiceItems(new Set());
    };
    
    const toggleInvoiceItemSelection = (itemId: string) => {
        const newSelection = new Set(selectedInvoiceItems);
        if (newSelection.has(itemId)) { newSelection.delete(itemId); } else { newSelection.add(itemId); }
        setSelectedInvoiceItems(newSelection);
    };

    const handleToggleSelectAll = () => {
        if (!selectedInvoice) return;
        const allItemIds = selectedInvoice.items.map(item => item.id);
        if (allItemIds.length > 0 && allItemIds.every(id => selectedInvoiceItems.has(id))) {
            setSelectedInvoiceItems(new Set());
        } else {
            setSelectedInvoiceItems(new Set(allItemIds));
        }
    };

    const transferSelectedItems = () => {
        if (!selectedInvoice || selectedInvoiceItems.size === 0) return;
        const itemsToTransfer = selectedInvoice.items
            .filter(item => selectedInvoiceItems.has(item.id))
            .map(item => ({
                id: item.id, description: item.description, width: item.width, height: item.height, quantity: item.quantity, area: item.area,
                processingType: 'Cường lực', grindingType: item.grindingType, sourceInvoiceId: selectedInvoice.id,
                customerName: selectedInvoice.customerName, unitPrice: item.unitPrice, total: item.total
            }));
        setTicketItems(prev => [...prev, ...itemsToTransfer]);
        setSelectedInvoiceItems(new Set());
    };
    
    const calculateTicketItem = (item: ProcessingTicketItem): ProcessingTicketItem => {
        const area = (item.width * item.height * item.quantity) / 1000000;
        return { ...item, area: parseFloat(area.toFixed(3)), total: parseFloat((area * (item.unitPrice || 0)).toFixed(0)) };
    };

    const updateTicketItem = (index: number, field: keyof ProcessingTicketItem, value: any) => {
        const newItems = [...ticketItems];
        newItems[index] = calculateTicketItem({ ...newItems[index], [field]: value });
        setTicketItems(newItems);
    };
    
    const handleAddTicketItem = () => {
        if (!currentItem.description || !currentItem.width || !currentItem.height || !currentItem.quantity) {
            showToast('Vui lòng điền đủ thông tin hàng hóa', 'error'); return;
        }
        setTicketItems(prev => [...prev, calculateTicketItem({
            id: Date.now().toString(), description: currentItem.description, width: currentItem.width, height: currentItem.height,
            quantity: currentItem.quantity, area: 0, processingType: currentItem.processingType || 'Cường lực', customerName: 'Hàng Lẻ',
            sourceInvoiceId: 'N/A', unitPrice: 0, total: 0
        })]);
        setCurrentItem({ quantity: 1 });
    };
    
    const removeTicketItem = (id: string) => setTicketItems(prev => prev.filter(item => item.id !== id));

    const handleSaveTicket = async () => {
        if (!ticket.id || !ticket.processingUnitId) { showToast('Vui lòng chọn đơn vị gia công', 'error'); return; }
        if (ticketItems.length === 0) { showToast('Phiếu gia công phải có ít nhất 1 sản phẩm', 'error'); return; }
        const unit = processingUnits.find(u => u.firebaseKey === ticket.processingUnitId);
        if (!unit) { showToast('Đơn vị gia công không hợp lệ', 'error'); return; }
        const finalTicket: ProcessingTicket = {
            ...ticket, processingUnitName: unit.name, items: ticketItems,
            totalArea: ticketItems.reduce((sum, item) => sum + item.area, 0),
            totalQuantity: ticketItems.reduce((sum, item) => sum + item.quantity, 0),
            status: 'new'
        } as ProcessingTicket;

        try {
            await db.saveProcessingTicket(finalTicket);
            showToast('Lưu phiếu gia công thành công!', 'success');
            onSave();
        } catch (error: any) { showToast(`Lỗi: ${error.message}`, 'error'); }
    };

    const areAllSelected = selectedInvoice ? selectedInvoice.items.length > 0 && selectedInvoice.items.every(item => selectedInvoiceItems.has(item.id)) : false;
    const totalTicketArea = ticketItems.reduce((sum, item) => sum + item.area, 0);
    const totalTicketQty = ticketItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalTicketAmount = ticketItems.reduce((sum, item) => sum + (item.total || 0), 0);

    return (
      <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 overflow-y-auto p-4">
        <div className="bg-slate-50 w-full max-w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col">
            <div className="px-6 py-3 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl flex-shrink-0">
                <h2 className="text-xl font-bold">
                    {existingTicket ? `Sửa Phiếu Gia Công: ${existingTicket.id}` : 'Tạo Phiếu Gia Công Mới'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X/></button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
                <div className="flex h-full gap-2">
                    {/* Left Panel */}
                    <div className={`flex-shrink-0 flex-col gap-4 h-full transition-all duration-300 ${isPanelVisible ? 'w-5/12 flex' : 'w-0 hidden'}`}>
                        <div className="bg-white p-3 rounded-xl shadow-sm border flex-shrink-0">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                                    <input type="text" placeholder="Tìm hóa đơn (số HĐ, tên KH)..." className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-100 outline-none" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} />
                                </div>
                                <button onClick={() => setFilterToday(p => !p)} className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${filterToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                                    Trong Ngày
                                </button>
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border flex flex-col" style={{ height: '150px' }}>
                             <h3 className="font-bold px-2 py-1 flex-shrink-0">Danh sách hóa đơn ({filteredInvoices.length})</h3>
                            <div className="flex-1 overflow-y-auto pr-1">
                                <table className="w-full text-sm">
                                   <thead className="sticky top-0 bg-slate-50 z-10"><tr><th className="p-2 text-left font-semibold">Số HĐ</th><th className="p-2 text-left font-semibold">Khách Hàng</th><th className="p-2 text-left font-semibold">Ngày</th><th className="p-2 text-right font-semibold">Tổng Tiền</th><th className="p-2 text-left font-semibold">Ghi chú</th></tr></thead>
                                   <tbody>{filteredInvoices.map(inv => (<tr key={inv.id} onClick={() => handleSelectInvoice(inv)} className={`cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-blue-100' : 'hover:bg-slate-50'}`}><td className="p-2 font-mono text-blue-800">{inv.id}</td><td className="p-2">{inv.customerName}</td><td className="p-2 text-slate-500">{new Date(inv.date).toLocaleDateString('vi-VN')}</td><td className="p-2 font-semibold text-right">{inv.totalAmount.toLocaleString()}đ</td><td className="p-2 text-slate-500 truncate max-w-xs">{inv.note}</td></tr>))}</tbody>
                                </table>
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border flex-1 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center p-2 border-b"><h3 className="font-bold">Chi tiết hóa đơn {selectedInvoice && `(${selectedInvoice.id})`}</h3><button onClick={transferSelectedItems} disabled={selectedInvoiceItems.size === 0} className="p-2 bg-white rounded-lg shadow border hover:bg-green-100 disabled:bg-slate-100 disabled:cursor-not-allowed"><ChevronRight className={selectedInvoiceItems.size > 0 ? "text-green-600" : "text-slate-400"} size={20}/></button></div>
                            <div className="flex items-center p-2 border-b bg-slate-50"><input type="checkbox" onChange={handleToggleSelectAll} checked={areAllSelected} className="mr-3 h-4 w-4" disabled={!selectedInvoice} /><label className="font-semibold text-sm">Chọn hết</label></div>
                            <div className="flex-1 overflow-y-auto pr-1 text-sm">{selectedInvoice ? (selectedInvoice.items.map(item => (<div key={item.id} onClick={() => toggleInvoiceItemSelection(item.id)} className={`flex items-center p-2 rounded-lg cursor-pointer ${selectedInvoiceItems.has(item.id) ? 'bg-green-100' : 'hover:bg-slate-50'}`}><input type="checkbox" readOnly checked={selectedInvoiceItems.has(item.id)} className="mr-3 h-4 w-4" /><div><p className="font-semibold">{item.description}</p><p className="text-xs text-slate-600">{`SL: ${item.quantity}, K.thước: ${item.height}x${item.width}`}</p></div></div>))) : (<div className="text-center text-slate-400 p-4">Chọn một hóa đơn để xem chi tiết</div>)}</div>
                        </div>
                    </div>

                    {/* Toggle Button */}
                    <div className="flex-shrink-0 flex items-center justify-center">
                        <button onClick={() => setIsPanelVisible(p => !p)} className="w-6 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-50 shadow z-10">
                            {isPanelVisible ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                    </div>

                    {/* Right Panel */}
                    <div className="flex-1 flex flex-col gap-3 h-full">
                         <div className="bg-white p-3 rounded-xl shadow-sm border space-y-3 flex-shrink-0">
                            <div className="grid grid-cols-3 gap-3 items-end">
                                <div><label className="font-bold text-sm">Mã phiếu</label><div className="flex gap-2"><input type="text" value={ticket.id || ''} readOnly className="w-full p-2 mt-1 border rounded-lg bg-slate-100 font-mono" /><button onClick={handleNewTicket} className="p-2 border rounded-lg hover:bg-slate-100"><RefreshCw size={20} /></button></div></div>
                                <div><label className="font-bold text-sm">Đơn vị gia công</label><select className="w-full p-2 mt-1 border rounded-lg" value={ticket.processingUnitId || ''} onChange={(e) => setTicket(prev => ({ ...prev, processingUnitId: e.target.value }))}><option value="">-- Chọn đơn vị --</option>{processingUnits.map(unit => (<option key={unit.firebaseKey} value={unit.firebaseKey}>{unit.name}</option>))}</select></div>
                                <div><label className="font-bold text-sm">Ngày lập</label><input type="date" value={ticket.date || ''} onChange={e => setTicket(prev => ({...prev, date: e.target.value}))} className="w-full p-2 mt-1 border rounded-lg" /></div>
                            </div>
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end text-sm">
                                <div><label className="font-bold text-xs">Tên hàng</label><input type="text" value={currentItem.description || ''} onChange={e => setCurrentItem(prev => ({...prev, description: e.target.value}))} className="w-full p-2 mt-1 border rounded-lg" /></div>
                                <div><label className="font-bold text-xs">Cao (mm)</label><input type="number" value={currentItem.height || ''} onChange={e => setCurrentItem(prev => ({...prev, height: Number(e.target.value)}))} className="w-full p-2 mt-1 border rounded-lg" /></div>
                                <div><label className="font-bold text-xs">Rộng (mm)</label><input type="number" value={currentItem.width || ''} onChange={e => setCurrentItem(prev => ({...prev, width: Number(e.target.value)}))} className="w-full p-2 mt-1 border rounded-lg" /></div>
                                <div><label className="font-bold text-xs">SL</label><input type="number" value={currentItem.quantity || ''} onChange={e => setCurrentItem(prev => ({...prev, quantity: Number(e.target.value)}))} className="w-full p-2 mt-1 border rounded-lg" /></div>
                                <button onClick={handleAddTicketItem} className="bg-blue-500 text-white rounded-lg h-10 self-end"><Plus /></button>
                            </div>
                        </div>
                        <div className="bg-white p-2 rounded-xl shadow-sm border flex-1 overflow-hidden flex flex-col">
                            <h3 className="font-bold p-2 flex-shrink-0">Chi tiết phiếu gia công</h3>
                            <div className="flex-1 overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-slate-50 z-10"><tr><th className="p-2 text-left">Tên Hàng</th><th className="p-2 text-center">Cao</th><th className="p-2 text-center">Rộng</th><th className="p-2 text-center">SL</th><th className="p-2 text-center">M2</th><th className="p-2 text-left">Kiểu GC</th><th className="p-2 text-right">Đơn Giá</th><th className="p-2 text-right">Thành Tiền</th><th className="p-2 text-left">Tên KH</th><th className="p-2 text-left">Mã HĐ</th><th className="p-2"></th></tr></thead><tbody>{ticketItems.map((item, index) => (<tr key={item.id} className="border-t hover:bg-slate-50"><td className="p-1"><input type="text" value={item.description} onChange={e => updateTicketItem(index, 'description', e.target.value)} className="w-full p-1.5 rounded border bg-transparent" /></td><td className="p-1 w-20"><input type="number" value={item.height} onChange={e => updateTicketItem(index, 'height', Number(e.target.value))} className="w-full p-1.5 rounded border bg-transparent text-center" /></td><td className="p-1 w-20"><input type="number" value={item.width} onChange={e => updateTicketItem(index, 'width', Number(e.target.value))} className="w-full p-1.5 rounded border bg-transparent text-center" /></td><td className="p-1 w-16"><input type="number" value={item.quantity} onChange={e => updateTicketItem(index, 'quantity', Number(e.target.value))} className="w-full p-1.5 rounded border bg-transparent text-center" /></td><td className="p-2 text-center">{item.area.toFixed(3)}</td><td className="p-1 w-28"><select value={item.processingType} onChange={e => updateTicketItem(index, 'processingType', e.target.value)} className="w-full p-1.5 rounded border bg-transparent">{processingTypes.map(pt => <option key={pt} value={pt}>{pt}</option>)}</select></td><td className="p-1 w-24"><input type="number" value={item.unitPrice || ''} onChange={e => updateTicketItem(index, 'unitPrice', Number(e.target.value))} className="w-full p-1.5 rounded border bg-transparent text-right" /></td><td className="p-2 text-right font-bold text-blue-700">{(item.total || 0).toLocaleString()}</td><td className="p-1 w-24 truncate" title={item.customerName}>{item.customerName}</td><td className="p-1 w-24 truncate" title={item.sourceInvoiceId}>{item.sourceInvoiceId}</td><td className="p-2 text-center"><button onClick={() => removeTicketItem(item.id)} className="text-red-500 p-1 hover:bg-red-50 rounded-full"><Trash2 size={16} /></button></td></tr>))}</tbody></table></div>
                            <div className="p-2 border-t font-bold grid grid-cols-3 text-center bg-slate-50 flex-shrink-0"><span>Tổng SL: {totalTicketQty}</span><span>Tổng M2: {totalTicketArea.toFixed(3)}</span><span className="text-red-600">Tổng tiền: {totalTicketAmount.toLocaleString()}đ</span></div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="p-4 border-t bg-white rounded-b-2xl flex justify-end items-center gap-4 flex-shrink-0">
                <button onClick={onClose} className="px-6 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold">Hủy bỏ</button>
                <button onClick={handleSaveTicket} className="flex items-center gap-2 bg-green-600 text-white font-bold px-6 py-2 rounded-lg hover:bg-green-700">
                    <Save size={20} /> {existingTicket ? 'Cập Nhật Phiếu' : 'Lưu Phiếu Mới'}
                </button>
            </div>
        </div>
      </div>
    );
};
