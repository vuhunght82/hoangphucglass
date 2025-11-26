import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';
import { Customer, Invoice, Payment } from '../types';
import { useToast } from './Toast';
import { Search, Printer, DollarSign, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
    onPrint: (data: any, type: any) => void;
}

export const PaymentManager: React.FC<Props> = ({ onPrint }) => {
    const { showToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');

    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<'tien_mat' | 'chuyen_khoan'>('tien_mat');
    const [paymentNote, setPaymentNote] = useState('');

    const [adjustmentAmount, setAdjustmentAmount] = useState(0);
    const [adjustmentNote, setAdjustmentNote] = useState('');
    
    const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);

    // Edit/Delete state
    const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            const [customersData, invoicesData] = await Promise.all([db.getCustomers(), db.getInvoices()]);
            setCustomers(customersData);
            setAllInvoices(invoicesData);
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedCustomerId) {
            loadCustomerPayments();
        } else {
            setCustomerPayments([]);
        }
        resetForms();
    }, [selectedCustomerId]);

    const loadCustomerPayments = async () => {
        if (!selectedCustomerId) return;
        const payments = await db.getPaymentsByCustomerId(selectedCustomerId);
        setCustomerPayments(payments);
    };
    
    const handleSelectCustomer = (customerId: string) => {
        setSelectedCustomerId(customerId);
        const customer = customers.find(c => c.firebaseKey === customerId);
        setCustomerSearchTerm(customer?.name || '');
    };

    const resetForms = () => {
        setPaymentAmount(0);
        setPaymentNote('');
        setPaymentMethod('tien_mat');
        setAdjustmentAmount(0);
        setAdjustmentNote('');
        setEditingPayment(null);
    };

    const refreshData = async () => {
        if (!selectedCustomerId) return;
        await loadCustomerPayments();
        const updatedCustomers = await db.getCustomers();
        setCustomers(updatedCustomers);
    };

    const handleSavePayment = async () => {
        if (!selectedCustomerId) { showToast("Vui lòng chọn khách hàng", "error"); return; }
        if (paymentAmount <= 0) { showToast("Số tiền thanh toán phải lớn hơn 0", "error"); return; }
        
        const customer = customers.find(c => c.firebaseKey === selectedCustomerId);
        if (!customer) return;

        const paymentData: Payment = {
            firebaseKey: editingPayment?.firebaseKey,
            id: editingPayment?.id || '',
            customerId: selectedCustomerId,
            customerName: customer.name,
            date: editingPayment?.date || new Date().toISOString().split('T')[0],
            amount: paymentAmount,
            method: paymentMethod,
            note: paymentNote,
            type: 'payment'
        };

        try {
            await db.savePayment(paymentData, editingPayment);
            showToast(editingPayment ? "Cập nhật thanh toán thành công!" : "Lưu thanh toán thành công!", "success");
            resetForms();
            await refreshData();
        } catch (error: any) {
            showToast(error.message || "Lỗi khi lưu thanh toán", "error");
        }
    };

    const handleAdjustDebt = async () => {
        if (!selectedCustomerId) { showToast("Vui lòng chọn khách hàng", "error"); return; }
        if (adjustmentAmount === 0) { showToast("Số tiền điều chỉnh phải khác 0", "error"); return; }
        
        const customer = customers.find(c => c.firebaseKey === selectedCustomerId);
        if (!customer) return;

        const adjustmentData: Payment = {
            firebaseKey: editingPayment?.firebaseKey,
            id: editingPayment?.id || '',
            customerId: selectedCustomerId,
            customerName: customer.name,
            date: editingPayment?.date || new Date().toISOString().split('T')[0],
            amount: adjustmentAmount,
            method: 'dieu_chinh',
            note: adjustmentNote || (adjustmentAmount > 0 ? 'Cộng nợ cũ' : 'Giảm trừ công nợ'),
            type: 'debt_adjustment'
        };

        try {
            await db.savePayment(adjustmentData, editingPayment);
            showToast(editingPayment ? "Cập nhật điều chỉnh thành công!" : "Điều chỉnh công nợ thành công!", "success");
            resetForms();
            await refreshData();
        } catch (error: any) {
            showToast(error.message || "Lỗi khi điều chỉnh công nợ", "error");
        }
    };

    const handleEditClick = (payment: Payment) => {
        setEditingPayment(payment);
        if (payment.type === 'payment') {
            setPaymentAmount(payment.amount);
            setPaymentMethod(payment.method as 'tien_mat' | 'chuyen_khoan');
            setPaymentNote(payment.note || '');
        } else {
            setAdjustmentAmount(payment.amount);
            setAdjustmentNote(payment.note || '');
        }
    };

    const handleDeleteClick = (payment: Payment) => {
        setPaymentToDelete(payment);
        setIsConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!paymentToDelete || !paymentToDelete.firebaseKey) return;
        try {
            await db.deletePayment(paymentToDelete.firebaseKey);
            showToast("Đã xóa giao dịch thành công!", "success");
            await refreshData();
        } catch (error: any) {
            showToast(error.message || "Lỗi khi xóa giao dịch", "error");
        }
        setPaymentToDelete(null);
    };
    
    const handlePrint = async () => {
        if (!selectedCustomer) return;
        const customerCongNoInvoices = allInvoices.filter(
            (inv) => inv.customerId === selectedCustomerId && inv.paymentType === 'cong_no'
        );
        const printPayload = { 
            customer: selectedCustomer, 
            invoices: customerCongNoInvoices, 
            payments: customerPayments 
        };
        onPrint(printPayload, 'paymentStatement');
    };
    
    const selectedCustomer = customers.find(c => c.firebaseKey === selectedCustomerId);
    const outstandingInvoices = allInvoices.filter(inv => inv.customerId === selectedCustomerId && inv.remainingAmount > 0);
    
    const calculatedDebt = useMemo(() => {
        if (!selectedCustomer) return 0;
    
        const customerCongNoInvoices = allInvoices.filter(
          (inv) => inv.customerId === selectedCustomerId && inv.paymentType === 'cong_no'
        );
    
        let debt = customerCongNoInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    
        customerPayments.forEach((p) => {
          if (p.type === 'payment') {
            debt -= p.amount;
          } else if (p.type === 'debt_adjustment') {
            debt += p.amount;
          }
        });
    
        return debt;
      }, [selectedCustomer, allInvoices, customerPayments]);
    
    const filteredCustomers = customerSearchTerm
        ? customers.filter(c => c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()))
        : [];

    return (
        <div className="px-6 pt-4 pb-6 space-y-6">
            <ConfirmationModal 
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="Xác nhận xóa?"
                message={`Bạn có chắc muốn xóa giao dịch này? Hành động này sẽ cập nhật lại công nợ của khách hàng.`}
            />

            <div className="bg-white p-4 rounded-2xl shadow-sm border">
                <label className="font-bold text-slate-700">Chọn khách hàng:</label>
                <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm khách hàng..."
                        className="w-full pl-10 p-2 border rounded-lg"
                        value={customerSearchTerm}
                        onChange={(e) => {
                            setCustomerSearchTerm(e.target.value);
                            setSelectedCustomerId('');
                        }}
                    />
                    {filteredCustomers.length > 0 && customerSearchTerm && (
                        <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-60 overflow-y-auto">
                            {filteredCustomers.map(c => (
                                <div key={c.firebaseKey} onClick={() => handleSelectCustomer(c.firebaseKey!)} className="p-2 hover:bg-slate-100 cursor-pointer">
                                    {c.name} - {c.phone}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedCustomer && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Actions */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border">
                           <div className="flex justify-between items-center">
                             <h2 className="text-xl font-bold text-blue-800">{selectedCustomer.name}</h2>
                             <button onClick={handlePrint} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-lg font-bold text-slate-700 hover:bg-slate-200"><Printer size={16}/> In Đối Soát</button>
                           </div>
                           <p className="text-3xl font-bold text-red-600 mt-2">{(calculatedDebt || 0).toLocaleString()}đ <span className="text-sm text-slate-500 font-medium">Tổng nợ (đối soát)</span></p>
                        </div>
                        
                        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                           <h3 className="font-bold text-lg text-green-700 flex items-center gap-2"><DollarSign size={20}/> {editingPayment && editingPayment.type === 'payment' ? 'Sửa Thanh Toán' : 'Ghi nhận Thanh toán'}</h3>
                           <div>
                               <label className="text-sm font-medium">Số tiền thanh toán</label>
                               <input type="number" value={paymentAmount || ''} onChange={e => setPaymentAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1 font-bold text-lg" />
                           </div>
                           <div>
                               <label className="text-sm font-medium">Hình thức</label>
                               <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded-lg mt-1">
                                   <option value="tien_mat">Tiền mặt</option>
                                   <option value="chuyen_khoan">Chuyển khoản</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-sm font-medium">Ghi chú</label>
                               <textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} className="w-full p-2 border rounded-lg mt-1 h-20" placeholder="VD: Thanh toán cho HĐ..."></textarea>
                           </div>
                           <div className="flex gap-2">
                            {editingPayment && editingPayment.type === 'payment' && <button onClick={resetForms} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-200 transition">Hủy Sửa</button>}
                            <button onClick={handleSavePayment} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">{editingPayment && editingPayment.type === 'payment' ? 'Cập Nhật' : 'Lưu Thanh Toán'}</button>
                           </div>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                           <h3 className="font-bold text-lg text-orange-700 flex items-center gap-2"><PlusCircle size={20}/> {editingPayment && editingPayment.type === 'debt_adjustment' ? 'Sửa Điều Chỉnh' : 'Điều chỉnh Công nợ'}</h3>
                           <div>
                               <label className="text-sm font-medium">Số tiền điều chỉnh</label>
                               <input type="number" value={adjustmentAmount || ''} onChange={e => setAdjustmentAmount(Number(e.target.value))} className="w-full p-2 border rounded-lg mt-1 font-bold text-lg" placeholder="Nhập số dương để cộng nợ, số âm để trừ" />
                           </div>
                           <div>
                               <label className="text-sm font-medium">Lý do</label>
                               <textarea value={adjustmentNote} onChange={e => setAdjustmentNote(e.target.value)} className="w-full p-2 border rounded-lg mt-1 h-20" placeholder="VD: Thêm nợ cũ, giảm trừ chiết khấu..."></textarea>
                           </div>
                           <div className="flex gap-2">
                             {editingPayment && editingPayment.type === 'debt_adjustment' && <button onClick={resetForms} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-lg hover:bg-slate-200 transition">Hủy Sửa</button>}
                             <button onClick={handleAdjustDebt} className="w-full bg-orange-500 text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition">{editingPayment && editingPayment.type === 'debt_adjustment' ? 'Cập Nhật' : 'Lưu Điều Chỉnh'}</button>
                           </div>
                        </div>
                    </div>

                    {/* Right Column: Data */}
                    <div className="space-y-6">
                       <div className="bg-white rounded-2xl shadow-sm border">
                          <h3 className="font-bold p-4 border-b">Hóa đơn chưa thanh toán ({outstandingInvoices.length})</h3>
                          <div className="max-h-64 overflow-y-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                {outstandingInvoices.map(inv => (
                                    <tr key={inv.firebaseKey} className="border-b last:border-0">
                                        <td className="p-3">
                                            <p className="font-bold">{inv.id}</p>
                                            <p className="text-xs text-slate-500">{new Date(inv.date).toLocaleDateString('vi-VN')}</p>
                                        </td>
                                        <td className="p-3 text-right font-bold text-red-500">{inv.remainingAmount.toLocaleString()}đ</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                          </div>
                       </div>
                        <div className="bg-white rounded-2xl shadow-sm border">
                          <h3 className="font-bold p-4 border-b">Lịch sử thanh toán & điều chỉnh</h3>
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                                <tbody>
                                {customerPayments.map(p => (
                                    <tr key={p.firebaseKey} className="border-b last:border-0 group hover:bg-slate-50">
                                        <td className="p-3">
                                            <p className={`font-bold ${p.type === 'payment' ? 'text-green-600' : 'text-orange-600'}`}>{p.amount.toLocaleString()}đ</p>
                                            <p className="text-xs text-slate-500">{new Date(p.date).toLocaleDateString('vi-VN')}</p>
                                        </td>
                                        <td className="p-3 text-slate-600">
                                           {p.note}
                                           <p className="text-xs italic">{p.method === 'tien_mat' ? 'Tiền mặt' : (p.method === 'chuyen_khoan' ? 'Chuyển khoản' : 'Điều chỉnh')}</p>
                                        </td>
                                        <td className="p-3 w-24 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEditClick(p)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"><Edit size={16}/></button>
                                                <button onClick={() => handleDeleteClick(p)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg"><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                          </div>
                       </div>
                    </div>
                </div>
            )}
        </div>
    );
};