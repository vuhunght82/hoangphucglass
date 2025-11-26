import React from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, Linkedin } from 'lucide-react';
import { COMPANY_INFO } from '../constants';

export const Footer: React.FC = () => {
  return (
    <footer id="contact" className="bg-slate-900 text-white pt-16 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center mb-6">
               <div className="w-10 h-10 bg-sky-500 rounded-lg flex items-center justify-center mr-3">
                 <span className="text-white font-bold text-xl">HP</span>
               </div>
               <span className="text-2xl font-bold tracking-tight">Hoàng Phúc</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              {COMPANY_INFO.slogan}. Chúng tôi cam kết mang đến những sản phẩm kính chất lượng cao nhất cho công trình của bạn.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Facebook size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="text-slate-400 hover:text-white transition-colors"><Linkedin size={20} /></a>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Liên Hệ</h3>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex items-start">
                <MapPin size={18} className="mr-3 text-sky-500 flex-shrink-0 mt-0.5" />
                <span>{COMPANY_INFO.address}</span>
              </li>
              <li className="flex items-center">
                <Phone size={18} className="mr-3 text-sky-500 flex-shrink-0" />
                <span>{COMPANY_INFO.phone}</span>
              </li>
              <li className="flex items-center">
                <Mail size={18} className="mr-3 text-sky-500 flex-shrink-0" />
                <span>{COMPANY_INFO.email}</span>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Sản Phẩm</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li><a href="#" className="hover:text-sky-400 transition-colors">Kính cường lực</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Kính ốp bếp</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Phòng tắm kính</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Cầu thang kính</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Cửa nhôm Xingfa</a></li>
            </ul>
          </div>

          {/* Working Hours */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white">Giờ Làm Việc</h3>
            <p className="text-sm text-slate-300 mb-2">Thứ 2 - Thứ 7</p>
            <p className="text-white font-bold mb-4">8:00 Sáng - 5:30 Chiều</p>
            <p className="text-sm text-slate-300 mb-2">Chủ Nhật</p>
            <p className="text-white font-bold">Nghỉ (Hỗ trợ online)</p>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} Hoàng Phúc Glass. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};