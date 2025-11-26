import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Customer, DebtSummary } from '../types';
import { useToast } from './Toast';
import { Search, Printer, FilePlus, Loader, Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
    onPrint: (data: DebtSummary, type: 'debtSummary') => void;
}

export const DebtSummaryManager: React.FC<Props> = ({ onPrint }) => {
    const { showToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [summaries, setSummaries] = useState<DebtSummary[]>([]);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [summaryToDelete, setSummaryToDelete] = useState<DebtSummary | null>(null);

    useEffect(() => {
        db.getCustomers().then(setCustomers);
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            loadSummaries();
        } else {
            setSummaries([]);
        }
    }, [selectedCustomerId]);

    const loadSummaries = async () => {
        if (!selectedCustomerId) return;
        setIsLoading(true);
        const data = await db.getDebtSummaries(selectedCustomerId);
        setSummaries(data);
        setIsLoading(false);
    };

    const handleGenerate = async () => {
        if (!selectedCustomerId) {
            showToast('Vui lòng chọn khách hàng.', 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const summaryId = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
            if(summaries.some(s => s.id === summaryId)) {
                if(!confirm(`Báo cáo cho kỳ ${selectedMonth}/${selectedYear} đã tồn tại. Bạn có muốn tạo lại và ghi đè?`)) {
                    setIsGenerating(false);
                    return;
                }
            }
            
            const summaryData = await db.generateDebtSummaryForPeriod(selectedCustomerId, selectedYear, selectedMonth);
            await db.saveDebtSummary(summaryData);
            
            showToast(`Đã tạo báo cáo công nợ cho tháng ${selectedMonth}/${selectedYear}`, 'success');
            await loadSummaries(); // Refresh list
        } catch (e: any) {
            showToast(e.message || 'Lỗi khi tạo báo cáo', 'error');
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleDeleteRequest = (summary: DebtSummary) => {
        setSummaryToDelete(summary);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!summaryToDelete) return;
        try {
            await db.deleteDebtSummary(summaryToDelete.customerId, summaryToDelete.id);
            showToast('Đã xóa báo cáo thành công!', 'success');
            await loadSummaries(); // Refresh list
        } catch (e: any) {
            showToast(e.message || 'Lỗi khi xóa báo cáo', 'error');
        } finally {
            setSummaryToDelete(null);
            setIsConfirmOpen(false);
        }
    };
    
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const selectedCustomer = customers.find(c => c.firebaseKey === selectedCustomerId);

    return (
        <div className="px-6 pt-4 pb-6 space-y-6">
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa báo cáo?"
                message={`Bạn có chắc muốn xóa vĩnh viễn báo cáo công nợ tháng ${summaryToDelete?.id}? Hành động này không thể hoàn tác.`}
            />
            <div className="bg-white p-6 rounded-2xl shadow-sm border grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                    <label className="font-bold text-slate-700">1. Chọn khách hàng</label>
                    <select
                        className="w-full p-2 border rounded-lg mt-1"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">-- Tất cả khách hàng --</option>
                        {customers.filter(c => c.paymentMode === 'cong_no').map(c => (
                            <option key={c.firebaseKey} value={c.firebaseKey}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="font-bold text-slate-700">2. Chọn kỳ báo cáo</label>
                    <div className="flex gap-2 mt-1">
                        <select
                            className="w-full p-2 border rounded-lg"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(Number(e.target.value))}
                        >
                            {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                        </select>
                        <select
                            className="w-full p-2 border rounded-lg"
                            value={selectedYear}
                            onChange={e => setSelectedYear(Number(e.target.value))}
                        >
                            {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !selectedCustomerId}
                        className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 disabled:bg-slate-400"
                    >
                        {isGenerating ? <Loader className="animate-spin" size={20} /> : <FilePlus size={20} />}
                        {isGenerating ? 'Đang xử lý...' : 'Tạo Báo Cáo'}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border">
                <h3 className="font-bold text-lg mb-4">Các bản đối soát đã tạo cho: <span className="text-blue-700">{selectedCustomer?.name || '...'}</span></h3>
                {isLoading ? (
                    <div className="text-center py-8">Đang tải...</div>
                ) : summaries.length > 0 ? (
                    <div className="space-y-3">
                        {summaries.map(summary => (
                            <div key={summary.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
                                <div>
                                    <p className="font-bold">Báo cáo tháng {summary.id.substring(5)}/{summary.id.substring(0, 4)}</p>
                                    <p className="text-sm text-slate-500">Tạo lúc: {new Date(summary.generatedAt).toLocaleString('vi-VN')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-red-600">{summary.closingBalance.toLocaleString()}đ</p>
                                    <p className="text-sm text-slate-500">Nợ cuối kỳ</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onPrint(summary, 'debtSummary')}
                                        className="p-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                                    >
                                        <Printer size={20} />
                                    </button>
                                     <button
                                        onClick={() => handleDeleteRequest(summary)}
                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-400">
                        {selectedCustomerId ? 'Không có bản đối soát nào cho khách hàng này.' : 'Vui lòng chọn một khách hàng để xem báo cáo.'}
                    </div>
                )}
            </div>
        </div>
    );
};