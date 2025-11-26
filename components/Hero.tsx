import React from 'react';
import { ArrowRight, ShieldCheck, Sun, PenTool } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <div className="relative bg-slate-900 overflow-hidden h-[600px] lg:h-[700px]">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop"
          alt="Modern Glass Building"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
        <div className="max-w-2xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-300 text-sm font-medium mb-6 backdrop-blur-sm">
            <ShieldCheck size={16} className="mr-2" />
            Cam kết chất lượng ISO 9001:2015
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Kiến Tạo Không Gian <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
              Đẳng Cấp & Bền Bỉ
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed">
            Hoàng Phúc Glass chuyên thi công kính cường lực, kính an toàn, và các giải pháp nhôm kính kiến trúc. Mang ánh sáng và sự sang trọng đến ngôi nhà của bạn.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-bold rounded-full text-white bg-primary hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/30 hover:scale-105">
              Khám Phá Sản Phẩm
              <ArrowRight className="ml-2 -mr-1" size={20} />
            </button>
            <button className="inline-flex items-center justify-center px-8 py-4 border border-white/30 backdrop-blur-sm text-base font-bold rounded-full text-white hover:bg-white/10 transition-all">
              Liên Hệ Tư Vấn
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/5 backdrop-blur-md border-t border-white/10 hidden md:block">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-3 gap-8 py-6">
             <div className="flex items-center text-white">
                <div className="p-3 bg-white/10 rounded-full mr-4">
                  <ShieldCheck size={24} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold">An Toàn Tuyệt Đối</h3>
                  <p className="text-sm text-slate-400">Kính cường lực chịu va đập gấp 5 lần</p>
                </div>
             </div>
             <div className="flex items-center text-white">
                <div className="p-3 bg-white/10 rounded-full mr-4">
                  <Sun size={24} className="text-yellow-400" />
                </div>
                <div>
                  <h3 className="font-bold">Cách Nhiệt Tối Ưu</h3>
                  <p className="text-sm text-slate-400">Giải pháp kính hộp tiết kiệm điện năng</p>
                </div>
             </div>
             <div className="flex items-center text-white">
                <div className="p-3 bg-white/10 rounded-full mr-4">
                  <PenTool size={24} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold">Thiết Kế Tinh Tế</h3>
                  <p className="text-sm text-slate-400">Đo đạc và thi công chuẩn xác từng mm</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};