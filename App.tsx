

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Menu, LayoutDashboard, FileText, Users, User, Settings, Printer, Edit, Trash2, X, LogOut, ShoppingBag, Wrench, Briefcase, ChevronLeft, ChevronRight, CheckCircle, AlertCircle, Plus, Building2, Save, Search, ArrowUpDown, Calendar, Check, Truck, CreditCard, Tag, BarChart2 } from 'lucide-react';
import { InvoiceForm } from './components/InvoiceForm';
import { GoodsReceiptForm } from './components/GoodsReceiptForm';
import { ResourceManager } from './components/ResourceManager';
import { PrintTemplate } from './components/PrintTemplates';
import { Dashboard } from './components/Dashboard';
import { PaymentManager } from './components/PaymentManager';
import { db } from './services/db';
import { Invoice, AppSettings, GoodsReceiptNote, ProcessingTicket, InvoiceFormInstance } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { ConfirmationModal } from './components/ConfirmationModal';
import { InvoiceList } from './components/InvoiceList';
import { GoodsReceiptList } from './components/GoodsReceiptList';
import { SettingsView } from './components/SettingsView';
import { ProcessingTicketManager } from './components/ProcessingTicketManager';
import { ProcessingTicketList } from './components/ProcessingTicketList';
import { PriceListManager } from './components/PriceListManager';
import { AIConsultant } from './components/AIConsultant';
import { DebtSummaryManager } from './components/DebtSummaryManager';
import { InvoiceDock } from './components/InvoiceDock';
import { LabelPrintManager } from './components/LabelPrintManager';
import { PrintPreviewModal } from './components/PrintPreviewModal';


// --- Main App Layout ---
const MainApp: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'dashboard' | 'invoices' | 'goodsReceipts' | 'customers' | 'products' | 'priceList' | 'processingUnits' | 'agencies' | 'employees' | 'settings' | 'payments' | 'debtSummaries'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State Triggers
  const [refreshInvoices, setRefreshInvoices] = useState(0);
  const [refreshGoodsReceipts, setRefreshGoodsReceipts] = useState(0);
  const [refreshProcessingTickets, setRefreshProcessingTickets] = useState(0);

  // Invoice Dock State
  const [openInvoiceForms, setOpenInvoiceForms] = useState<InvoiceFormInstance[]>([]);
  const [activeInvoiceFormId, setActiveInvoiceFormId] = useState<string | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [invoiceToDeleteDetails, setInvoiceToDeleteDetails] = useState<Invoice | null>(null);

  // Goods Receipt Modal
  const [showGoodsReceiptForm, setShowGoodsReceiptForm] = useState(false);
  const [editingGoodsReceipt, setEditingGoodsReceipt] = useState<GoodsReceiptNote | null>(null);

  // Processing Ticket Modal
  const [showProcessingTicketManager, setShowProcessingTicketManager] = useState(false);
  const [editingProcessingTicket, setEditingProcessingTicket] = useState<ProcessingTicket | null>(null);

  // Label Print Manager
  const [showLabelPrintManager, setShowLabelPrintManager] = useState(false);
  const [invoiceForLabels, setInvoiceForLabels] = useState<Invoice | null>(null);

  const resourceManagerRef = useRef<{ handleAddNew: () => void }>(null);
  
  // Unified Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [invoiceFilterStatus, setInvoiceFilterStatus] = useState('all');
  const [invoiceSortOption, setInvoiceSortOption] = useState('date_desc');
  const [invoiceFromDate, setInvoiceFromDate] = useState('');
  const [invoiceToDate, setInvoiceToDate] = useState('');
  
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  
  // State for the new print preview modal
  const [printPreview, setPrintPreview] = useState<{ title: string; content: React.ReactElement; type: string; } | null>(null);

  const handleSettingsChange = async () => {
    const settings = await db.getAppSettings();
    setAppSettings(settings);
  };

  useEffect(() => {
    handleSettingsChange(); // Load initial settings
  }, []);

  useEffect(() => {
    db.getInvoices().then(setAllInvoices);
  }, [refreshInvoices]);
  
  const safeGetDatePart = (dateStr: string | undefined | null) => {
    if (!dateStr || typeof dateStr !== 'string') return '';
    return dateStr.split('T')[0];
  }

  const processedInvoices = useMemo(() => {
    let processed = [...allInvoices];
    
    processed = processed.filter(inv => {
        if (invoiceFilterStatus !== 'all' && inv.paymentType !== invoiceFilterStatus) return false;
        const invDate = safeGetDatePart(inv.date);
        if (invoiceFromDate && invDate < invoiceFromDate) return false;
        if (invoiceToDate && invDate > invoiceToDate) return false;

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            const d = new Date(inv.date);
            const formattedDate = (inv.date && !isNaN(d.getTime())) ? `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}` : '';
            
            return inv.id.toLowerCase().includes(term) ||
                   inv.customerName.toLowerCase().includes(term) ||
                   (inv.note || '').toLowerCase().includes(term) ||
                   safeGetDatePart(inv.date).includes(term) ||
                   formattedDate.includes(term);
        }
        return true;
    });

    processed.sort((a, b) => {
        switch (invoiceSortOption) {
            case 'date_desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
            case 'date_asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
            case 'name_asc': return a.customerName.localeCompare(b.customerName);
            case 'name_desc': return b.customerName.localeCompare(a.customerName);
            default: return 0;
        }
    });

    return processed;
  }, [allInvoices, invoiceFilterStatus, searchTerm, invoiceSortOption, invoiceFromDate, invoiceToDate]);


  const handleSetView = (newView: typeof view) => {
    setSearchTerm(''); // Reset search term on view change
    setInvoiceFilterStatus('all');
    setInvoiceSortOption('date_desc');
    setInvoiceFromDate('');
    setInvoiceToDate('');
    setView(newView);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    const formExists = openInvoiceForms.some(form => form.id === invoice.id);
    if (formExists) {
        setActiveInvoiceFormId(invoice.id);
    } else {
        const newFormInstance: InvoiceFormInstance = { id: invoice.id, invoice: invoice };
        setOpenInvoiceForms(prev => [...prev, newFormInstance]);
        setActiveInvoiceFormId(invoice.id);
    }
  };

  const handleEditGoodsReceipt = (note: GoodsReceiptNote) => { setEditingGoodsReceipt(note); setShowGoodsReceiptForm(true); };
  const handleEditProcessingTicket = (ticket: ProcessingTicket) => { setEditingProcessingTicket(ticket); setShowProcessingTicketManager(true); };


  const handleDeleteInvoiceRequest = (invoice: Invoice) => {
    if (!invoice.firebaseKey) return;
    setItemToDelete(invoice.firebaseKey);
    setInvoiceToDeleteDetails(invoice);
    setIsConfirmOpen(true);
  };
  
  const confirmDeleteInvoice = async () => {
    if (!itemToDelete) return;
    try {
        await db.deleteInvoice(itemToDelete);
        setRefreshInvoices(p => p + 1);
    } catch (error: any) {
        console.error("Delete Invoice Error:", error);
    }
    setItemToDelete(null);
    setInvoiceToDeleteDetails(null);
  };
  
  // New print handler using a preview modal
  const handlePrint = (data: any, type: any) => {
    if (!appSettings || !appSettings.companyInfo) {
        showToast("Cài đặt hệ thống chưa được tải xong, vui lòng thử lại sau giây lát.", "info");
        return;
    }
    const safeCompanyInfo = appSettings.companyInfo || { name: 'Loading...', address: '', phone: '' };
    
    let title = "Xem trước khi in";
    if (type === 'invoice' || type === 'production' || type === 'delivery') title = `Xem trước: ${data.id}`;
    else if (type === 'labels' || type === 'label_preview') title = `Xem trước Tem cho Hóa đơn: ${data.id}`;
    else if (type === 'goodsReceipt') title = `Xem trước Phiếu Nhập: ${data.id}`;
    else if (type === 'processingTicket' || type === 'processingTicketInternal' || type === 'processingTicketExternal') title = `Xem trước Phiếu Gia Công: ${data.id}`;
    else if (type === 'paymentStatement') title = `Xem trước Đối Soát Công Nợ: ${data.customer.name}`;
    else if (type === 'debtSummary') title = `Xem trước Báo Cáo Công Nợ: ${data.id}`;

    setPrintPreview({
        title,
        content: (
            <PrintTemplate invoice={data} type={type} companyInfo={safeCompanyInfo} settings={appSettings}/>
        ),
        type,
    });
  };

  const executePrint = () => {
    if (!printPreview) { return; }
    const isLabelPrint = printPreview.type === 'labels' || printPreview.type === 'label_preview';

    const printContentEl = document.getElementById('print-preview-content');
    if (!printContentEl) {
        showToast('Lỗi: Không tìm thấy nội dung để in.', 'error');
        return;
    }
    const printContent = printContentEl.innerHTML;
    
    const headContent = document.head.innerHTML;

    let printSpecificStyles;
    if (isLabelPrint) {
        printSpecificStyles = `
          @page { 
            size: auto; 
            margin: 0 !important;
          }
          body { 
            background: transparent !important;
            -webkit-print-color-adjust: exact !important; /* Crucial for printing colors */
            print-color-adjust: exact !important;
          }
          /* Reset all elements for printing */
          * {
            color: #000 !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          /* Force backgrounds to be transparent, EXCEPT for our designated printable lines */
          *:not(.printable-line) {
             background-color: transparent !important;
          }
        `;
    } else {
        printSpecificStyles = `
          @page { 
            size: auto; 
            margin: 5mm !important;
          }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important;
          }
        `;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        ${headContent}
        <title>In Dữ Liệu</title>
        <style>
          @media print {
            ${printSpecificStyles}
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 200);
                }, 500);
            }
        </script>
      </body>
      </html>
    `;

    const newTab = window.open('', '_blank');
    if (newTab) {
        newTab.document.open();
        newTab.document.write(printHtml);
        newTab.document.close();
        setPrintPreview(null); // Close the preview modal
    } else {
        showToast('Không thể mở tab mới. Vui lòng tắt trình chặn pop-up.', 'error');
    }
  };


  const handlePrintLabelsRequest = (invoice: Invoice) => {
    setInvoiceForLabels(invoice);
    setShowLabelPrintManager(true);
  };

  const handlePrintList = () => {
    const statusMap: { [key in Invoice['status']]: string } = {
        chua_giao: 'Chưa giao',
        da_cat: 'Đã cắt',
        da_giao: 'Đã giao',
    };

    const tableRows = processedInvoices.map(inv => `
        <tr>
            <td>${inv.id}</td>
            <td>${new Date(inv.date).toLocaleDateString('vi-VN')}</td>
            <td>${inv.customerName}</td>
            <td style="text-align: right;">${inv.totalAmount.toLocaleString()}đ</td>
            <td style="text-align: right;">${inv.remainingAmount.toLocaleString()}đ</td>
            <td style="text-align: right;">${(inv.transportFee || 0).toLocaleString()}đ</td>
            <td style="text-align: right;">${(inv.deposit || 0).toLocaleString()}đ</td>
            <td>${inv.paymentType === 'cong_no' ? 'Công nợ' : 'Tiền mặt'}</td>
            <td>${statusMap[inv.status] || inv.status}</td>
            <td>${inv.note || ''}</td>
        </tr>
    `).join('');

    const totalAmountSum = processedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const remainingAmountSum = processedInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const transportFeeSum = processedInvoices.reduce((sum, inv) => sum + (inv.transportFee || 0), 0);
    const depositSum = processedInvoices.reduce((sum, inv) => sum + (inv.deposit || 0), 0);

    const tableFooter = `
      <tfoot>
        <tr style="font-size: 14px; font-weight: bold;">
          <td colspan="3">TỔNG CỘNG</td>
          <td style="text-align: right;">${totalAmountSum.toLocaleString()}đ</td>
          <td style="text-align: right;">${remainingAmountSum.toLocaleString()}đ</td>
          <td style="text-align: right;">${transportFeeSum.toLocaleString()}đ</td>
          <td style="text-align: right;">${depositSum.toLocaleString()}đ</td>
          <td colspan="3"></td>
        </tr>
      </tfoot>
    `;

    const printHtml = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <title>In Danh Sách Hóa Đơn</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 10px; }
          h1 { text-align: center; color: #333; margin-bottom: 0.5em; }
          p { text-align: center; margin-bottom: 1.5em; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 6px; text-align: left; word-break: break-word; }
          th { background-color: #f2f2f2; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          tfoot tr { background-color: #e0e0e0; }
          tfoot td { font-weight: bold; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>Danh Sách Hóa Đơn</h1>
        <p>Từ ngày: ${invoiceFromDate ? new Date(invoiceFromDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'Tất cả'} - Đến ngày: ${invoiceToDate ? new Date(invoiceToDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'Tất cả'}</p>
        <table>
          <thead>
            <tr>
              <th>Số HĐ</th>
              <th>Ngày</th>
              <th>Khách Hàng</th>
              <th style="text-align: right;">Tổng Tiền</th>
              <th style="text-align: right;">Còn Lại</th>
              <th style="text-align: right;">Tiền xe</th>
              <th style="text-align: right;">Trả trước</th>
              <th>Hình Thức</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
          ${tableFooter}
        </table>
        <script>
            window.onload = function() {
                setTimeout(function() {
                    window.print();
                }, 250);
            }
        </script>
      </body>
      </html>
    `;
    
    const newTab = window.open();
    if (newTab) {
        newTab.document.open();
        newTab.document.write(printHtml);
        newTab.document.close();
    }
  };

  const handleCreateNewInvoice = () => {
    const newId = `new_${Date.now()}`;
    const newFormInstance: InvoiceFormInstance = { id: newId, invoice: null };
    setOpenInvoiceForms(prev => [...prev, newFormInstance]);
    setActiveInvoiceFormId(newId);
  };

  const handleCreateNew = () => {
    if (view === 'invoices') { handleCreateNewInvoice(); }
    else if (view === 'goodsReceipts') { setEditingGoodsReceipt(null); setShowGoodsReceiptForm(true); }
    else if (view === 'processingUnits') { setEditingProcessingTicket(null); setShowProcessingTicketManager(true); }
    else if (resourceManagerRef.current) { resourceManagerRef.current.handleAddNew(); }
  };

  const resourceViews = ['customers', 'products', 'agencies', 'employees'];

  // --- Invoice Dock Handlers ---
  const handleCloseInvoiceForm = (id: string) => {
      setOpenInvoiceForms(prev => prev.filter(form => form.id !== id));
      if (activeInvoiceFormId === id) {
          const remainingForms = openInvoiceForms.filter(form => form.id !== id);
          setActiveInvoiceFormId(remainingForms.length > 0 ? remainingForms[remainingForms.length - 1].id : null);
      }
  };
  const handleActivateInvoiceForm = (id: string) => setActiveInvoiceFormId(id);
  const handleMinimizeInvoiceForm = (id: string) => {
      if(activeInvoiceFormId === id) {
        setActiveInvoiceFormId(null);
      }
  };

  const handleSaveInvoice = (savedInvoiceId: string, formId: string) => {
      setRefreshInvoices(p => p + 1);
      if (formId.startsWith('new_')) {
          setOpenInvoiceForms(prev => prev.map(form => 
              form.id === formId ? { ...form, id: savedInvoiceId, invoice: { ...(form.invoice || {} as Invoice), id: savedInvoiceId } } : form
          ));
          if (activeInvoiceFormId === formId) {
              setActiveInvoiceFormId(savedInvoiceId);
          }
      }
  };


  return (
    <>
      <div id="main-layout" className={`relative min-h-screen bg-slate-100 font-sans text-slate-800`}>
        <header className="fixed top-0 left-0 right-0 h-12 bg-blue-600 text-white flex items-center justify-between px-4 z-50 shadow-md">
           <div className="flex items-center"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-4 p-1"><Menu size={20} /></button><div className="font-bold text-lg">HOÀNG PHÚC GLASS</div></div>
           <div className="flex items-center gap-4 text-sm font-medium"><span>Tổng quan hệ thống bán hàng kính xây dựng</span></div>
        </header>
         <ConfirmationModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmDeleteInvoice}
          title="Xác nhận xóa?"
          message={`Bạn có chắc muốn xóa hóa đơn "${invoiceToDeleteDetails?.id || ''}"?`}
        />

        <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-blue-700 text-white shadow-xl transform transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-12`}>
            <nav className="p-2 space-y-1">
               <button onClick={() => handleSetView('dashboard')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'dashboard' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><LayoutDashboard size={18} className="mr-3" /> Tổng quan</button>
               <button onClick={() => handleSetView('invoices')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'invoices' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><FileText size={18} className="mr-3" /> Hóa đơn</button>
               <button onClick={() => handleSetView('payments')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'payments' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><CreditCard size={18} className="mr-3" /> Thanh toán</button>
               <button onClick={() => handleSetView('debtSummaries')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'debtSummaries' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><BarChart2 size={18} className="mr-3" /> Đối Soát Nợ</button>
               <button onClick={() => handleSetView('goodsReceipts')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'goodsReceipts' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Truck size={18} className="mr-3" /> Nhập Hàng</button>
               <button onClick={() => handleSetView('customers')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'customers' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Users size={18} className="mr-3" /> Khách hàng</button>
               <button onClick={() => handleSetView('products')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'products' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><ShoppingBag size={18} className="mr-3" /> Hàng hóa</button>
               <button onClick={() => handleSetView('priceList')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'priceList' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Tag size={18} className="mr-3" /> Bảng giá</button>
               <button onClick={() => handleSetView('processingUnits')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'processingUnits' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Wrench size={18} className="mr-3" /> Gia công</button>
               <button onClick={() => handleSetView('agencies')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'agencies' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Briefcase size={18} className="mr-3" /> Đại lý</button>
               <button onClick={() => handleSetView('employees')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'employees' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><User size={18} className="mr-3" /> Nhân viên</button>
               <button onClick={() => handleSetView('settings')} className={`w-full flex items-center px-4 py-3 rounded ${view === 'settings' ? 'bg-blue-800' : 'hover:bg-blue-600'}`}><Settings size={18} className="mr-3" /> Cài đặt</button>
            </nav>
        </aside>

        <main className={`absolute top-12 left-0 right-0 bottom-0 overflow-y-auto transition-all ${isSidebarOpen ? 'pl-60' : 'pl-0'}`}>
          <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-30">
              <div className="flex justify-between items-center gap-4">
                  <h1 className="text-xl font-bold text-slate-800 flex-shrink-0">
                      {view === 'dashboard' && 'Tổng quan hoạt động'}
                      {view === 'invoices' && 'Quản lý Hóa đơn'}
                      {view === 'payments' && 'Quản lý Công Nợ & Thanh Toán'}
                      {view === 'debtSummaries' && 'Đối Soát & Báo Cáo Công Nợ'}
                      {view === 'goodsReceipts' && 'Quản lý Nhập Hàng'}
                      {view === 'customers' && 'Quản lý Khách hàng'}
                      {view === 'products' && 'Quản lý Hàng hóa'}
                      {view === 'priceList' && 'Quản lý Bảng Giá Niêm Yết'}
                      {view === 'processingUnits' && 'Danh sách Phiếu Gia Công'}
                      {view === 'agencies' && 'Quản lý Đại lý'}
                      {view === 'employees' && 'Quản lý Nhân viên'}
                      {view === 'settings' && 'Cài đặt hệ thống'}
                  </h1>

                  {/* Search & Filter Bar */}
                  <div className="flex-1 flex justify-end items-center gap-3">
                      {view === 'invoices' && (
                          <>
                            <div className="flex-1 max-w-md relative">
                              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                              <input type="text" placeholder="Tìm kiếm hóa đơn..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            </div>
                            <input type="date" value={invoiceFromDate} onChange={e => setInvoiceFromDate(e.target.value)} className="border p-2 rounded-xl text-sm" />
                            <input type="date" value={invoiceToDate} onChange={e => setInvoiceToDate(e.target.value)} className="border p-2 rounded-xl text-sm" />
                            <select className="border p-2 rounded-xl bg-white text-sm" value={invoiceFilterStatus} onChange={e => setInvoiceFilterStatus(e.target.value)}>
                                <option value="all">Tất cả thanh toán</option>
                                <option value="tien_mat">Tiền mặt</option>
                                <option value="cong_no">Công nợ</option>
                            </select>
                            <select className="border p-2 rounded-xl bg-white text-sm" value={invoiceSortOption} onChange={e => setInvoiceSortOption(e.target.value)}>
                                <option value="date_desc">Mới nhất</option>
                                <option value="date_asc">Cũ nhất</option>
                                <option value="name_asc">Tên A-Z</option>
                            </select>
                          </>
                      )}

                      {(view === 'goodsReceipts' || resourceViews.includes(view) || view === 'processingUnits') && (
                          <div className="flex-1 max-w-sm relative">
                              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                              <input type="text" placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                          </div>
                      )}
                  </div>

                  {/* Action Buttons */}
                   <div className="flex items-center gap-3">
                      {view === 'invoices' && (
                          <button onClick={handlePrintList} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-bold flex items-center text-sm hover:bg-slate-200 transition-colors">
                              <Printer size={16} className="mr-2" /> In DS
                          </button>
                      )}
                      {['invoices', 'goodsReceipts', ...resourceViews, 'processingUnits'].includes(view) && (
                          <button onClick={handleCreateNew} className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center text-sm"><Plus size={16} className="mr-2" /> Tạo Mới</button>
                      )}
                  </div>
              </div>
          </div>

          <div className="max-w-7xl mx-auto">
            {view === 'dashboard' && <Dashboard />}
            {view === 'invoices' && <InvoiceList invoices={processedInvoices} onEdit={handleEditInvoice} onPrint={handlePrint} onDeleteRequest={handleDeleteInvoiceRequest} onPrintLabels={handlePrintLabelsRequest} />}
            {view === 'payments' && <PaymentManager onPrint={handlePrint} />}
            {view === 'debtSummaries' && <DebtSummaryManager onPrint={handlePrint} />}
            {view === 'goodsReceipts' && <GoodsReceiptList onEdit={handleEditGoodsReceipt} onPrint={handlePrint} refreshTrigger={refreshGoodsReceipts} searchTerm={searchTerm} />}
            {view === 'customers' && <ResourceManager type="customer" ref={resourceManagerRef} searchTerm={searchTerm} />}
            {view === 'products' && <ResourceManager type="product" ref={resourceManagerRef} searchTerm={searchTerm} />}
            {view === 'priceList' && <PriceListManager />}
            {view === 'processingUnits' && <ProcessingTicketList onEdit={handleEditProcessingTicket} onPrint={handlePrint} searchTerm={searchTerm} refreshTrigger={refreshProcessingTickets} onAddNew={() => { setEditingProcessingTicket(null); setShowProcessingTicketManager(true); }} />}
            {view === 'agencies' && <ResourceManager type="agency" ref={resourceManagerRef} searchTerm={searchTerm} />}
            {view === 'employees' && <ResourceManager type="employee" ref={resourceManagerRef} searchTerm={searchTerm} />}
            {view === 'settings' && <SettingsView onSettingsChange={handleSettingsChange} />}
          </div>
        </main>

        <div className="invoice-forms-container">
          {openInvoiceForms.map(formInstance => (
              formInstance.id === activeInvoiceFormId && (
                  <InvoiceForm
                      key={formInstance.id}
                      formId={formInstance.id}
                      onClose={() => handleCloseInvoiceForm(formInstance.id)}
                      onMinimize={() => handleMinimizeInvoiceForm(formInstance.id)}
                      onSave={(savedInvoiceId) => handleSaveInvoice(savedInvoiceId, formInstance.id)}
                      existingInvoice={formInstance.invoice}
                  />
              )
          ))}
        </div>

        {showGoodsReceiptForm && <GoodsReceiptForm onClose={() => setShowGoodsReceiptForm(false)} onSave={() => { setShowGoodsReceiptForm(false); setRefreshGoodsReceipts(p => p + 1); }} existingNote={editingGoodsReceipt} />}
        {showProcessingTicketManager && <ProcessingTicketManager onClose={() => setShowProcessingTicketManager(false)} onSave={() => { setShowProcessingTicketManager(false); setRefreshProcessingTickets(p => p + 1); }} existingTicket={editingProcessingTicket} />}
        {showLabelPrintManager && invoiceForLabels && appSettings && (
          <LabelPrintManager
              invoice={invoiceForLabels}
              settings={appSettings}
              onClose={() => setShowLabelPrintManager(false)}
              onPrint={handlePrint}
          />
        )}
        
        <InvoiceDock
          isSidebarOpen={isSidebarOpen}
          forms={openInvoiceForms}
          activeFormId={activeInvoiceFormId}
          onActivate={handleActivateInvoiceForm}
          onClose={handleCloseInvoiceForm}
        />
        
        <AIConsultant />
      </div>
      {printPreview && (
        <PrintPreviewModal
          isOpen={!!printPreview}
          onClose={() => setPrintPreview(null)}
          onPrint={executePrint}
          title={printPreview.title}
        >
          {printPreview.content}
        </PrintPreviewModal>
      )}
    </>
  );
};

const App: React.FC = () => (
    <ToastProvider>
        <MainApp />
    </ToastProvider>
);

export default App;