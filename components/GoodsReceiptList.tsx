import React, { useState, useEffect, useMemo } from 'react';
import { GoodsReceiptNote } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';
import { Edit, Printer, Trash2, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react';

interface Props {
  onEdit: (note: GoodsReceiptNote) => void;
  onPrint: (note: any, type: any) => void;
  refreshTrigger: number;
  searchTerm: string;
}

const AnalyticsChart: React.FC<{ title: string, data: { label: string, value: number }[] }> = ({ title, data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <h3 className="text-lg font-bold text-green-800 mb-2 flex items-center"><BarChart3 size={20} className="mr-2"/> {title}</h3>
                <div className="text-center py-8 text-slate-400">Không có dữ liệu để hiển thị.</div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colors = ['bg-green-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-slate-500'];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h3 className="text-lg font-bold text-green-800 mb-4 flex items-center"><BarChart3 size={20} className="mr-2"/> {title}</h3>
            <div className="space-y-3">
                {data.slice(0, 7).map((item, index) => (
                    <div key={item.label} className="flex items-center gap-4 group">
                        <div className="w-40 text-sm font-semibold text-slate-600 truncate text-right">{item.label}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-6">
                            <div
                                className={`${colors[index % colors.length]} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            >
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{item.value.toLocaleString()}₫</span>
                            </div>
                        </div>
                        <div className="w-24 text-sm font-bold text-slate-800">{item.value.toLocaleString()}₫</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const GoodsReceiptList: React.FC<Props> = ({ onEdit, onPrint, refreshTrigger, searchTerm }) => {
    const { showToast } = useToast();
    const [notes, setNotes] = useState<GoodsReceiptNote[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadNotes();
    }, [refreshTrigger]);

    const loadNotes = async () => {
        const [data, settings] = await Promise.all([db.getGoodsReceiptNotes(), db.getAppSettings()]);
        setNotes(data);
        setItemsPerPage(settings.itemsPerPage || 10);
    };

    const handleDeleteRequest = (key: string | undefined) => {
        if (!key) return;
        setItemToDelete(key);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await db.deleteGoodsReceiptNote(itemToDelete);
            showToast('Đã xóa phiếu nhập thành công!', 'success');
            await loadNotes();
        } catch (error: any) {
            showToast(error.message || 'Xóa phiếu nhập thất bại.', 'error');
        }
        setItemToDelete(null);
    };

    const filteredNotes = notes.filter(n => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        return n.id.toLowerCase().includes(term) || n.agencyName.toLowerCase().includes(term) || (n.note || '').toLowerCase().includes(term);
    });
    
    const chartData = useMemo(() => {
        const agencyTotals = filteredNotes.reduce<Record<string, number>>((acc, note) => {
            const agency = note.agencyName || 'Không xác định';
            // FIX: Explicitly cast both operands to Number to prevent type errors.
            acc[agency] = Number(acc[agency] || 0) + Number(note.totalAmount);
            return acc;
        }, {});

        return Object.entries(agencyTotals)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => Number(b.value) - Number(a.value));
    }, [filteredNotes]);

    const totalPages = Math.ceil(filteredNotes.length / itemsPerPage);
    const displayedNotes = filteredNotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const noteToDeleteDetails = notes.find(n => n.firebaseKey === itemToDelete);

    return (
        <div className="px-6 pt-4 pb-6">
            <ConfirmationModal 
              isOpen={isConfirmOpen}
              onClose={() => setIsConfirmOpen(false)}
              onConfirm={confirmDelete}
              title="Xác nhận xóa?"
              message={`Bạn có chắc muốn xóa phiếu nhập "${noteToDeleteDetails?.id || ''}"?`}
            />
            
            <AnalyticsChart title="Tổng giá trị nhập theo Nhà Cung Cấp" data={chartData} />

            <div className="grid gap-4">
                {displayedNotes.map(note => (
                    <div key={note.firebaseKey || note.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="font-bold text-lg text-green-700">{note.id}</span>
                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${note.paymentType === 'cong_no' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                    {note.paymentType === 'cong_no' ? 'Công nợ' : 'Tiền mặt'}
                                </span>
                            </div>
                            <p className="text-slate-800 font-bold">{note.agencyName}</p>
                            <p className="text-slate-400 text-sm">{new Date(note.date).toLocaleDateString('vi-VN')} | {note.items.length} mặt hàng</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Tổng cộng:</p>
                            <p className="font-bold text-xl text-green-900">{(note.totalAmount || 0).toLocaleString()}đ</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto justify-end border-t md:border-0 pt-4 md:pt-0">
                            <button onClick={() => onEdit(note)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={18} /></button>
                            <button onClick={() => onPrint(note, 'goodsReceipt')} className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100"><Printer size={18} /></button>
                            <button onClick={() => handleDeleteRequest(note.firebaseKey)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
                {filteredNotes.length === 0 && (
                     <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                        <p className="text-slate-500">Không tìm thấy phiếu nhập nào.</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="no-print flex justify-center items-center gap-2 mt-8">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={20} /></button>
                     <span className="text-sm font-medium">Trang {currentPage} / {totalPages}</span>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={20} /></button>
                </div>
            )}
        </div>
    );
};