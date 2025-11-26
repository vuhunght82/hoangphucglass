import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { ProcessingTicket } from '../types';
import { useToast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';
import { Edit, Printer, Trash2, BarChart3, Search, Plus } from 'lucide-react';

interface Props {
  onEdit: (ticket: ProcessingTicket) => void;
  onAddNew: () => void;
  onPrint: (ticket: any, type: any) => void;
  refreshTrigger: number;
  searchTerm: string;
}

type Period = 'today' | 'week' | 'month' | 'year';

const AnalyticsChart: React.FC<{ title: string, data: { label: string, value: number }[] }> = ({ title, data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center py-8 text-slate-400">Không có đủ dữ liệu để hiển thị.</div>;
    }
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-teal-500', 'bg-slate-500'];
    return (
        <div className="space-y-3">
            {data.slice(0, 5).map((item, index) => (
                <div key={item.label} className="flex items-center gap-4 group">
                    <div className="w-40 text-sm font-semibold text-slate-600 truncate text-right">{item.label}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-6"><div className={`${colors[index % colors.length]} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`} style={{ width: `${(item.value / maxValue) * 100}%` }}><span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{item.value.toLocaleString()}₫</span></div></div>
                    <div className="w-24 text-sm font-bold text-slate-800">{item.value.toLocaleString()}₫</div>
                </div>
            ))}
        </div>
    );
};

export const ProcessingTicketList: React.FC<Props> = ({ onEdit, onPrint, refreshTrigger, searchTerm, onAddNew }) => {
    const { showToast } = useToast();
    const [tickets, setTickets] = useState<ProcessingTicket[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [period, setPeriod] = useState<Period>('month');

    useEffect(() => { loadTickets(); }, [refreshTrigger]);

    const loadTickets = async () => setTickets(await db.getProcessingTickets());

    const handleDeleteRequest = (key: string | undefined) => {
        if (!key) return;
        setItemToDelete(key);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await db.deleteProcessingTicket(itemToDelete);
            showToast('Đã xóa phiếu thành công!', 'success');
            await loadTickets();
        } catch (error: any) {
            showToast(error.message || 'Xóa phiếu thất bại.', 'error');
        }
        setItemToDelete(null);
    };

    const filteredTickets = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        switch (period) {
            case 'today': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
            case 'week': const d = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); startDate = new Date(new Date().setDate(d)); startDate.setHours(0,0,0,0); break;
            case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
        }
        const startDateStr = startDate.toISOString().split('T')[0];

        return tickets.filter(t => {
            const term = searchTerm.toLowerCase().trim();
            const matchSearch = !term || t.id.toLowerCase().includes(term) || t.processingUnitName.toLowerCase().includes(term);
            const matchDate = t.date >= startDateStr;
            return matchSearch && matchDate;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [tickets, searchTerm, period]);
    
    const chartData = useMemo(() => {
        const unitTotals = filteredTickets.reduce<Record<string, number>>((acc, ticket) => {
            const unit = ticket.processingUnitName || 'Không xác định';
            // FIX: Explicitly cast both operands to Number to prevent type errors.
            acc[unit] = Number(acc[unit] || 0) + Number(ticket.totalAmount ?? 0);
            return acc;
        }, {});
        return Object.entries(unitTotals).map(([label, value]) => ({ label, value })).sort((a, b) => Number(b.value) - Number(a.value));
    }, [filteredTickets]);

    const itemToDeleteDetails = tickets.find(t => t.firebaseKey === itemToDelete);

    const FilterButtons = () => {
        const filters: { key: Period, label: string }[] = [{ key: 'today', label: 'Hôm nay' }, { key: 'week', label: 'Tuần này' }, { key: 'month', label: 'Tháng này' }, { key: 'year', label: 'Năm nay' }];
        return (
          <div className="flex items-center bg-slate-100 p-1 rounded-full">
            {filters.map(f => (<button key={f.key} onClick={() => setPeriod(f.key)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-300 ${period === f.key ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>{f.label}</button>))}
          </div>
        );
    };

    return (
        <div className="px-6 pt-4 pb-6">
            <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={confirmDelete} title="Xác nhận xóa?" message={`Bạn có chắc muốn xóa phiếu "${itemToDeleteDetails?.id || ''}"?`} />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-blue-800 flex items-center"><BarChart3 size={20} className="mr-2"/> Phân tích theo Đơn vị Gia công</h3>
                    <FilterButtons />
                </div>
                <AnalyticsChart title="Tổng giá trị gia công" data={chartData} />
            </div>
            <div className="grid gap-4">
                {filteredTickets.map(ticket => (
                    <div key={ticket.firebaseKey || ticket.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition">
                        <div>
                            <p className="font-bold text-lg text-indigo-700">{ticket.id}</p>
                            <p className="text-slate-800 font-bold">{ticket.processingUnitName}</p>
                            <p className="text-slate-400 text-sm">{new Date(ticket.date).toLocaleDateString('vi-VN')} | {ticket.items.length} hạng mục</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-slate-500">Tổng cộng:</p>
                            <p className="font-bold text-xl text-indigo-900">{(ticket.totalAmount || 0).toLocaleString()}đ</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto justify-end border-t md:border-0 pt-4 md:pt-0">
                            <button onClick={() => onEdit(ticket)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit size={18} /></button>
                             <div className="relative group">
                                <button className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-100 transition"><Printer size={18} /></button>
                                <div className="absolute right-0 top-full mt-1 w-48 bg-red-600 rounded-lg shadow-xl py-2 hidden group-hover:block z-10 text-white">
                                    <button onClick={() => onPrint(ticket, 'processingTicketExternal')} className="w-full text-left px-4 py-2 hover:bg-red-700 text-base font-semibold transition-colors">In Phiếu GC</button>
                                    <button onClick={() => onPrint(ticket, 'processingTicketInternal')} className="w-full text-left px-4 py-2 hover:bg-red-700 text-base font-semibold transition-colors">In Phiếu Nội Bộ</button>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteRequest(ticket.firebaseKey)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
                {filteredTickets.length === 0 && (<div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed"><p className="text-slate-500">Không tìm thấy phiếu gia công nào.</p></div>)}
            </div>
        </div>
    );
};