import React, { useEffect, useState } from 'react';
import { FileText, DollarSign, Users, Package, BarChart3, TrendingUp, Calendar, Box, Activity, ShoppingBag, Star } from 'lucide-react';
import { db } from '../services/db';

const StatCard: React.FC<{ icon: React.ReactNode, title: string, value: string | number, subValue?: string | number, unit?: string, color: string }> = ({ icon, title, value, subValue, unit = '₫', color }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </div>
        <div className="mt-4">
            <p className="text-slate-500 font-medium">{title}</p>
            <p className="text-3xl font-bold text-slate-800">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {unit && <span className="text-xl font-semibold ml-1">{unit}</span>}
            </p>
            {subValue && <p className="text-sm text-slate-400 mt-1">{subValue}</p>}
        </div>
    </div>
);

type Period = 'today' | 'week' | 'month' | 'year';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    totalInvoices: 0,
    totalGoods: 0,
    totalCustomers: 0,
    revenueByProduct: [],
    chartLabels: [],
    revenueData: [],
    quantityData: []
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      const data = await db.getDashboardStats({ period });
      setStats(data);
      setLoading(false);
    };
    loadStats();
  }, [period]);

  const FilterButtons = () => {
      const filters: { key: Period, label: string }[] = [
        { key: 'today', label: 'Hôm nay' },
        { key: 'week', label: 'Tuần này' },
        { key: 'month', label: 'Tháng này' },
        { key: 'year', label: 'Năm nay' },
      ];
      return (
        <div className="flex items-center bg-slate-100 p-1 rounded-full">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setPeriod(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-300 ${
                period === f.key ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      );
  };

  if (loading) {
    return <div className="p-8 flex justify-center text-blue-600"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
  }

  const topProduct = stats.revenueByProduct?.[0] || { name: 'Chưa có', total: 0 };
  const maxChartRevenue = Math.max(...(stats.revenueData || []), 1);

  return (
    <div className="px-6 pt-4 pb-6 space-y-6 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Tổng Quan Nhanh</h1>
        <FilterButtons />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<DollarSign size={24} className="text-green-500"/>} title="Tổng Doanh Thu" value={stats.totalRevenue} color="bg-green-100" />
        <StatCard icon={<FileText size={24} className="text-blue-500"/>} title="Tổng Hóa Đơn" value={stats.totalInvoices} unit="" color="bg-blue-100"/>
        <StatCard icon={<ShoppingBag size={24} className="text-indigo-500"/>} title="Sản phẩm đã bán" value={stats.totalGoods} unit="" color="bg-indigo-100"/>
        <StatCard icon={<Star size={24} className="text-amber-500"/>} title="Sản Phẩm Vàng" value={topProduct.name} subValue={`${topProduct.total.toLocaleString()} ₫`} unit="" color="bg-amber-100"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Analytics Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-xl font-bold text-blue-800">Biểu đồ Doanh thu & Số lượng</h3>
             <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-sky-400 mr-2"></div>Doanh thu</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-sm bg-slate-300 mr-2"></div>Số lượng</div>
             </div>
          </div>

          <div className="h-[400px]">
              <div className="h-full flex items-end justify-between gap-2 px-2">
                  {(stats.chartLabels || []).map((label: string, idx: number) => {
                      const revenueVal = stats.revenueData[idx] || 0;
                      const quantityVal = stats.quantityData[idx] || 0;
                      
                      const revenueHeight = (revenueVal / maxChartRevenue) * 100;
                      // Use the same scale for quantity for visual comparison relative to revenue
                      const quantityHeight = (stats.quantityData.reduce((s,v) => s+v, 0) > 0) 
                        ? (quantityVal / Math.max(...stats.quantityData)) * 100 * 0.6 // Scale quantity bar to be smaller
                        : 0;

                      return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                          <div className="flex items-end w-full h-full gap-1 justify-center">
                              <div className="w-1/2 group relative">
                                  <div 
                                      className="bg-sky-400 rounded-t-md hover:bg-sky-500 transition-all duration-300"
                                      style={{ height: `${Math.max(revenueHeight, 1)}%` }}
                                  ></div>
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                                      {revenueVal.toLocaleString()} ₫
                                  </div>
                              </div>
                               <div className="w-1/2 group relative">
                                  <div 
                                      className="bg-slate-300 rounded-t-md hover:bg-slate-400 transition-all duration-300"
                                      style={{ height: `${Math.max(quantityHeight, 1)}%` }}
                                  ></div>
                                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-10 pointer-events-none">
                                      {quantityVal.toLocaleString()} sp
                                  </div>
                              </div>
                          </div>
                          <span className="text-xs text-slate-500 mt-2 font-medium">{label}</span>
                      </div>
                      );
                  })}
              </div>
          </div>
        </div>
        
        {/* Top Products Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center gap-2"><Box /> Hàng Hóa Bán Chạy</h3>
           <div className="max-h-[420px] overflow-y-auto space-y-1 -mr-2 pr-2">
               {(stats.revenueByProduct || []).slice(0, 15).map((product: any, idx: number) => (
                   <div key={product.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50/70 transition-colors">
                       <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                           {idx + 1}
                       </span>
                       <div className="flex-1 overflow-hidden">
                           <p className="font-semibold text-slate-800 text-sm truncate" title={product.name}>{product.name}</p>
                           <p className="text-xs text-slate-500">{product.quantity.toLocaleString()} sản phẩm</p>
                       </div>
                       <p className="font-bold text-sky-700 text-sm">{product.total.toLocaleString()} ₫</p>
                   </div>
               ))}
                {stats.revenueByProduct.length === 0 && (
                    <div className="text-center py-10 text-slate-400">Không có dữ liệu.</div>
                )}
           </div>
        </div>
      </div>
    </div>
  );
};