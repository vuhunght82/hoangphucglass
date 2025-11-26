
import React, { useState, useEffect } from 'react';
import { Invoice, AppSettings } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';
import { Edit, Printer, Trash2, Calendar, FileText, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface Props {
  invoices: Invoice[];
  onEdit: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice, type: any) => void;
  onDeleteRequest: (invoice: Invoice) => void;
  onPrintLabels: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<Props> = ({ invoices, onEdit, onPrint, onDeleteRequest, onPrintLabels }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    db.getAppSettings().then(settings => {
      if (settings && settings.itemsPerPage) {
        setItemsPerPage(settings.itemsPerPage);
      }
    });
  }, []);
  
  // Reset page to 1 if the invoices list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [invoices]);

  const totalPages = Math.ceil(invoices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedInvoices = invoices.slice(startIndex, startIndex + itemsPerPage);

  const getStatusTagClass = (status: Invoice['status']) => {
    const map: { [key in Invoice['status']]: string } = {
      chua_giao: 'bg-slate-100 text-slate-700',
      da_cat: 'bg-purple-100 text-purple-700',
      da_giao: 'bg-green-100 text-green-700',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  return (
    <div className="px-6 pt-4 pb-6">
      <div className="space-y-4">
          {displayedInvoices.map(invoice => (
              <div key={invoice.firebaseKey} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                              <span className="font-bold text-lg text-blue-700">{invoice.id}</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getStatusTagClass(invoice.status)}`}>
                                  {invoice.status.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${invoice.paymentType === 'cong_no' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {invoice.paymentType === 'cong_no' ? 'Công nợ' : 'Tiền mặt'}
                              </span>
                          </div>
                          
                          <div className="my-2 p-2 rounded-lg bg-green-100 text-green-800 text-center">
                            <h3 className="font-bold text-xl">{invoice.customerName}</h3>
                          </div>
                          
                          <p className="text-sm text-slate-500 flex items-center mt-1">
                              <Calendar size={14} className="mr-1" /> {new Date(invoice.date).toLocaleDateString('vi-VN')}
                              <span className="mx-2">•</span>
                              {invoice.items.length} mặt hàng
                          </p>
                          {invoice.note && (
                              <p className="mt-2 p-3 bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-lg text-base">
                                  <strong>Ghi chú:</strong> {invoice.note}
                              </p>
                          )}
                      </div>
                      
                      <div className="flex items-start gap-4">
                        <div className="text-right shrink-0">
                            <p className="text-sm text-slate-500">Tổng cộng</p>
                            <p className="text-xl font-bold text-blue-900">{invoice.totalAmount.toLocaleString()}đ</p>
                             {invoice.remainingAmount > 0 ? (
                              <p className="text-sm font-bold text-red-600 mt-1">Cần thanh toán: {invoice.remainingAmount.toLocaleString()}đ</p>
                            ) : (
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <CheckCircle size={16} className="text-green-500" />
                                <p className="text-sm font-bold text-green-600">Đã thanh toán</p>
                              </div>
                            )}
                        </div>

                        <div className="flex gap-2 w-full md:w-auto justify-end self-start">
                            <button onClick={() => onEdit(invoice)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Edit size={18} /></button>
                            <div className="relative group">
                                <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition"><Printer size={18} /></button>
                                <div className="absolute right-0 top-full w-48 bg-blue-600 rounded-lg shadow-xl py-2 hidden group-hover:block z-10 origin-top-right">
                                    <button onClick={() => onPrint(invoice, 'invoice')} className="w-full text-left px-4 py-2 text-white hover:bg-blue-700 text-base font-semibold transition-colors">In Hóa Đơn</button>
                                    <button onClick={() => onPrint(invoice, 'production')} className="w-full text-left px-4 py-2 text-white hover:bg-blue-700 text-base font-semibold transition-colors">In Lệnh SX</button>
                                    <button onClick={() => onPrint(invoice, 'delivery')} className="w-full text-left px-4 py-2 text-white hover:bg-blue-700 text-base font-semibold transition-colors">In Giao Hàng</button>
                                    <button onClick={() => onPrintLabels(invoice)} className="w-full text-left px-4 py-2 text-white hover:bg-blue-500 text-base font-bold transition-colors">In Tem Dán</button>
                                </div>
                            </div>
                            <button onClick={() => onDeleteRequest(invoice)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"><Trash2 size={18} /></button>
                        </div>
                      </div>
                  </div>
              </div>
          ))}
          
          {invoices.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-500">Không tìm thấy hóa đơn nào.</p>
              </div>
          )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
            <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
            >
                <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-slate-600">Trang {currentPage} / {totalPages}</span>
            <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border hover:bg-slate-50 disabled:opacity-50"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      )}
    </div>
  );
};
