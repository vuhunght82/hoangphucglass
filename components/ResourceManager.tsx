import React, { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, User, Users, ShoppingBag, Wrench, Briefcase, BarChart3 } from 'lucide-react';
import { Customer, Employee, ProductItem, ProcessingUnit, Agency, AppSettings, Invoice, Payment } from '../types';
import { db } from '../services/db';
import { useToast } from './Toast';
import { ConfirmationModal } from './ConfirmationModal';

interface Props {
  type: 'customer' | 'employee' | 'product' | 'processingUnit' | 'agency';
  searchTerm: string;
}

const AnalyticsChart: React.FC<{ title: string, data: { label: string, value: number }[] }> = ({ title, data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center"><BarChart3 size={20} className="mr-2"/> {title}</h3>
                <div className="text-center py-8 text-slate-400">Không có đủ dữ liệu để hiển thị.</div>
            </div>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);
    const colors = ['bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-pink-500', 'bg-slate-500'];

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center"><BarChart3 size={20} className="mr-2"/> {title}</h3>
            <div className="space-y-3">
                {data.slice(0, 5).map((item, index) => (
                    <div key={item.label} className="flex items-center gap-4 group">
                        <div className="w-32 text-sm font-semibold text-slate-600 truncate text-right">{item.label}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-6">
                            <div
                                className={`${colors[index % colors.length]} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            >
                                <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{item.value}</span>
                            </div>
                        </div>
                         <div className="w-10 text-sm font-bold text-slate-800">{item.value}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const ResourceManager = forwardRef<{ handleAddNew: () => void }, Props>(({ type, searchTerm }, ref) => {
  const { showToast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>({});
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [type]);

  const loadData = async () => {
    if (type === 'customer') {
        const [customers, invoices, allPayments] = await Promise.all([
            db.getCustomers(),
            db.getInvoices(),
            db.getAllPayments(),
        ]);
        
        const debtMap: Record<string, number> = {};
        
        invoices.forEach(invoice => {
            if (invoice.paymentType === 'cong_no' && invoice.customerId) {
                debtMap[invoice.customerId] = (debtMap[invoice.customerId] || 0) + Number(invoice.totalAmount);
            }
        });
    
        allPayments.forEach(payment => {
            if (payment.customerId) {
                if (payment.type === 'payment') {
                    debtMap[payment.customerId] = (debtMap[payment.customerId] || 0) - Number(payment.amount);
                } else if (payment.type === 'debt_adjustment') {
                    debtMap[payment.customerId] = (debtMap[payment.customerId] || 0) + Number(payment.amount);
                }
            }
        });
        
        const customersWithDebt = customers.map(c => ({
            ...c,
            currentDebt: debtMap[c.firebaseKey!] || 0,
        }));
        setItems(customersWithDebt);
    }
    else if (type === 'employee') setItems(await db.getEmployees());
    else if (type === 'product') setItems(await db.getProducts());
    else if (type === 'processingUnit') setItems(await db.getProcessingUnits());
    else if (type === 'agency') setItems(await db.getAgencies());
  };

  const loadSettings = async () => {
    const appSettings = await db.getAppSettings();
    setSettings(appSettings);
  }

  const handleAddNew = async () => {
      if (type === 'customer') {
          const nextCode = await db.getNextCustomerCode();
          setCurrentItem({ code: nextCode, paymentMode: 'cong_no' });
      } else if (type === 'product') {
          const nextCode = await db.getNextProductCode();
          setCurrentItem({ code: nextCode });
      } else if (type === 'processingUnit') {
          const nextCode = await db.getNextProcessingUnitCode();
          setCurrentItem({ code: nextCode });
      } else if (type === 'agency') {
          const nextCode = await db.getNextAgencyCode();
          setCurrentItem({ code: nextCode });
      } else {
          setCurrentItem({});
      }
      setIsModalOpen(true);
  };

  useImperativeHandle(ref, () => ({ handleAddNew }));

  const handleSave = async () => {
    try {
        if (type === 'customer') await db.saveCustomer(currentItem as Customer);
        else if (type === 'employee') await db.saveEmployee(currentItem as Employee);
        else if (type === 'product') await db.saveProduct(currentItem as ProductItem);
        else if (type === 'processingUnit') await db.saveProcessingUnit(currentItem as ProcessingUnit);
        else if (type === 'agency') await db.saveAgency(currentItem as Agency);
        
        showToast('Lưu thành công!', 'success');
        setIsModalOpen(false);
        await loadData();
    } catch (e: any) {
        showToast(e.message || 'Lưu thất bại', 'error');
    }
  };

  const handleDeleteRequest = (key: string | undefined) => {
    if (!key) {
      showToast("Lỗi: Không thể xác định mục cần xóa.", "error");
      return;
    }
    setItemToDelete(key);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (type === 'customer') await db.deleteCustomer(itemToDelete);
      else if (type === 'employee') await db.deleteEmployee(itemToDelete);
      else if (type === 'product') await db.deleteProduct(itemToDelete);
      else if (type === 'processingUnit') await db.deleteProcessingUnit(itemToDelete);
      else if (type === 'agency') await db.deleteAgency(itemToDelete);
      
      showToast('Đã xóa thành công!', 'success');
      await loadData();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || `Lỗi khi xóa.`, 'error');
    }
    setItemToDelete(null);
  };

  const filteredItems = items.filter(i => {
    const term = (searchTerm || '').toLowerCase();
    if (!term) return true;

    if (type === 'customer') return (i.name || '').toLowerCase().includes(term) || (i.phone || '').includes(term) || (i.code || '').toLowerCase().includes(term);
    else if (type === 'employee') return (i.fullName || '').toLowerCase().includes(term) || (i.username || '').toLowerCase().includes(term);
    else if (type === 'product') return (i.name || '').toLowerCase().includes(term) || (i.code || '').toLowerCase().includes(term);
    else if (type === 'processingUnit' || type === 'agency') return (i.name || '').toLowerCase().includes(term) || (i.code || '').toLowerCase().includes(term) || (i.phone || '').includes(term);
    return false;
  });

  const chartData = useMemo(() => {
    if (type !== 'customer' && type !== 'processingUnit') return null;
    
    const groupCounts = filteredItems.reduce((acc: Record<string, number>, item) => {
        const group = item.tradeGroup || 'Chưa phân loại';
        acc[group] = (acc[group] || 0) + 1;
        return acc;
    }, {});
    
    return Object.entries(groupCounts)
        .map(([label, value]) => ({ label, value: Number(value) }))
        .sort((a, b) => b.value - a.value);
  }, [filteredItems, type]);


  const itemToDeleteDetails = items.find(i => i.firebaseKey === itemToDelete);
  let confirmMessage = "Bạn có chắc chắn muốn xóa mục này?";
  if (itemToDeleteDetails) {
      if (type === 'customer') confirmMessage = `Bạn có chắc chắn muốn xóa khách hàng "${itemToDeleteDetails?.name || ''}"?`;
      else if (type === 'employee') confirmMessage = `Bạn có chắc chắn muốn xóa nhân viên "${itemToDeleteDetails?.fullName || itemToDeleteDetails?.username || ''}"?`;
      else if (type === 'product') confirmMessage = `Bạn có chắc chắn muốn xóa hàng hóa "${itemToDeleteDetails?.name || ''}"?`;
      else if (type === 'processingUnit') confirmMessage = `Bạn có chắc chắn muốn xóa đơn vị "${itemToDeleteDetails?.name || ''}"?`;
      else if (type === 'agency') confirmMessage = `Bạn có chắc chắn muốn xóa đại lý "${itemToDeleteDetails?.name || ''}"?`;
  }

  const getTitle = () => {
    switch(type) {
        case 'customer': return { icon: <Users className="mr-2" />, text: 'Khách Hàng' };
        case 'employee': return { icon: <User className="mr-2" />, text: 'Nhân Viên' };
        case 'product': return { icon: <ShoppingBag className="mr-2" />, text: 'Hàng Hóa' };
        case 'processingUnit': return { icon: <Wrench className="mr-2" />, text: 'Đơn vị Gia công' };
        case 'agency': return { icon: <Briefcase className="mr-2" />, text: 'Đại lý' };
    }
  }

  return (
    <div className="px-6 pt-4 pb-6">
      <ConfirmationModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={confirmDelete} title="Xác nhận xóa?" message={confirmMessage} />
      
      {chartData && (
          <AnalyticsChart 
            title={`Phân tích ${type === 'customer' ? 'Khách hàng' : 'Đơn vị Gia công'} theo Nhóm nghề`}
            data={chartData} 
          />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-blue-50 text-blue-800">
            <tr>
              <th className="p-4 font-bold">Mã</th>
              <th className="p-4 font-bold">Tên</th>
              <th className="p-4 font-bold">Điện thoại</th>
              <th className="p-4 font-bold">Địa chỉ</th>
              {type === 'customer' && <th className="p-4 font-bold">Nhóm nghề</th>}
              {type === 'customer' && <th className="p-4 font-bold text-right">Công nợ</th>}
              {type === 'customer' && <th className="p-4 font-bold text-right">Hạn mức nợ</th>}
              {type === 'agency' && <th className="p-4 font-bold text-right">Dư nợ</th>}
              {type === 'employee' && <th className="p-4 font-bold">Ngày sinh</th>}
              {type === 'processingUnit' && <th className="p-4 font-bold">Nhóm nghề</th>}
              <th className="p-4 font-bold text-center">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => (
              <tr key={item.firebaseKey || item.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-sm font-bold text-slate-600">{item.code || item.username}</td>
                <td className="p-4 font-bold text-slate-800">{item.name || item.fullName}</td>
                <td className="p-4 text-slate-600">{item.phone}</td>
                <td className="p-4 text-slate-600">{item.address}</td>
                
                {type === 'customer' && (
                    <td className="p-4"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-xs font-bold">{item.tradeGroup}</span></td>
                )}
                
                {type === 'customer' && (
                    <td className="p-4 text-right font-bold text-red-600">{(item.currentDebt || 0).toLocaleString()}đ</td>
                )}
                {type === 'customer' && (
                    <td className="p-4 text-right font-bold text-orange-600">{(item.debtLimit || 0).toLocaleString()}đ</td>
                )}
                
                {type === 'agency' && (
                    <td className="p-4 text-right font-bold text-red-600">{(item.currentDebt || 0).toLocaleString()}đ</td>
                )}

                {type === 'employee' && <td className="p-4 text-slate-600">{item.birthDate}</td>}
                
                {type === 'processingUnit' && (
                    <td className="p-4"><span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-bold">{item.tradeGroup}</span></td>
                )}

                <td className="p-4 flex justify-center gap-2">
                  <button 
                    onClick={() => { setCurrentItem(item); setIsModalOpen(true); }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDeleteRequest(item.firebaseKey)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
                <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">Không tìm thấy dữ liệu</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
           <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl">
              <h3 className="text-xl font-bold mb-6">Thông Tin {getTitle().text}</h3>
              <div className="space-y-4 grid grid-cols-2 gap-4">
                 {type === 'customer' && (
                   <>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Tên Khách Hàng</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Mã KH</label><input type="text" className="w-full p-2 border rounded-xl font-mono bg-slate-50" value={currentItem.code || ''} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Số điện thoại</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.phone || ''} onChange={e => setCurrentItem({...currentItem, phone: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Địa chỉ</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.address || ''} onChange={e => setCurrentItem({...currentItem, address: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Hình thức</label><select className="w-full p-2 border rounded-xl" value={currentItem.paymentMode || 'cong_no'} onChange={e => setCurrentItem({...currentItem, paymentMode: e.target.value})}><option value="cong_no">Công nợ</option><option value="tien_mat">Tiền mặt</option></select></div>
                     <div><label className="block text-sm font-bold mb-1">Công nợ hiện tại</label><input type="number" className="w-full p-2 border rounded-xl text-red-600 font-bold" value={currentItem.currentDebt || 0} onChange={e => setCurrentItem({...currentItem, currentDebt: Number(e.target.value)})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Dư nợ tối đa</label><input type="number" className="w-full p-2 border rounded-xl font-bold" value={currentItem.debtLimit || 0} onChange={e => setCurrentItem({...currentItem, debtLimit: Number(e.target.value)})} /></div>
                     <div className="col-span-1"><label className="block text-sm font-bold mb-1">Nhóm nghề</label><select className="w-full p-2 border rounded-xl" value={currentItem.tradeGroup || ''} onChange={e => setCurrentItem({...currentItem, tradeGroup: e.target.value})}><option value="">-- Chọn nhóm nghề --</option>{(settings?.customerTradeGroups || []).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                   </>
                 )}
                 {type === 'employee' && (
                   <>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Họ và Tên</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.fullName || ''} onChange={e => setCurrentItem({...currentItem, fullName: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Tên đăng nhập</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.username || ''} onChange={e => setCurrentItem({...currentItem, username: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Mật khẩu</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.password || ''} onChange={e => setCurrentItem({...currentItem, password: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Số điện thoại</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.phone || ''} onChange={e => setCurrentItem({...currentItem, phone: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Ngày sinh</label><input type="date" className="w-full p-2 border rounded-xl" value={currentItem.birthDate || ''} onChange={e => setCurrentItem({...currentItem, birthDate: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Địa chỉ</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.address || ''} onChange={e => setCurrentItem({...currentItem, address: e.target.value})} /></div>
                   </>
                 )}
                 {type === 'product' && (
                   <>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Tên Hàng Hóa</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Mã Hàng</label><input type="text" className="w-full p-2 border rounded-xl font-mono bg-slate-50" value={currentItem.code || ''} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Đơn vị tính</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.unit || 'm2'} onChange={e => setCurrentItem({...currentItem, unit: e.target.value})} /></div>
                   </>
                 )}
                 {type === 'processingUnit' && (
                   <>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Tên Đơn Vị</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Mã Đơn Vị</label><input type="text" className="w-full p-2 border rounded-xl font-mono bg-slate-50" value={currentItem.code || ''} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Số điện thoại</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.phone || ''} onChange={e => setCurrentItem({...currentItem, phone: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Địa chỉ</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.address || ''} onChange={e => setCurrentItem({...currentItem, address: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Email</label><input type="email" className="w-full p-2 border rounded-xl" value={currentItem.email || ''} onChange={e => setCurrentItem({...currentItem, email: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Nhóm nghề</label><select className="w-full p-2 border rounded-xl" value={currentItem.tradeGroup || ''} onChange={e => setCurrentItem({...currentItem, tradeGroup: e.target.value})}><option value="">-- Chọn nhóm nghề --</option>{(settings?.processingUnitTradeGroups || []).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                   </>
                 )}
                 {type === 'agency' && (
                   <>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Tên Đại lý</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.name || ''} onChange={e => setCurrentItem({...currentItem, name: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Mã Đại lý</label><input type="text" className="w-full p-2 border rounded-xl font-mono bg-slate-50" value={currentItem.code || ''} onChange={e => setCurrentItem({...currentItem, code: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Số điện thoại</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.phone || ''} onChange={e => setCurrentItem({...currentItem, phone: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Địa chỉ</label><input type="text" className="w-full p-2 border rounded-xl" value={currentItem.address || ''} onChange={e => setCurrentItem({...currentItem, address: e.target.value})} /></div>
                     <div className="col-span-2"><label className="block text-sm font-bold mb-1">Email</label><input type="email" className="w-full p-2 border rounded-xl" value={currentItem.email || ''} onChange={e => setCurrentItem({...currentItem, email: e.target.value})} /></div>
                     <div><label className="block text-sm font-bold mb-1">Dư nợ hiện tại</label><input type="number" className="w-full p-2 border rounded-xl text-red-600 font-bold" value={currentItem.currentDebt || 0} onChange={e => setCurrentItem({...currentItem, currentDebt: Number(e.target.value)})} /></div>
                   </>
                 )}
              </div>
              <div className="flex justify-end mt-8 gap-3 border-t pt-4">
                 <button onClick={() => setIsModalOpen(false)} className="px-4 py-2">Hủy</button>
                 <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold">Lưu lại</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
});
