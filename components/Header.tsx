import React, { useState } from 'react';
import { Menu, X, Phone, Search } from 'lucide-react';
import { COMPANY_INFO } from '../constants';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { label: 'Trang Chủ', href: '#' },
    { label: 'Sản Phẩm', href: '#products' },
    { label: 'Dịch Vụ', href: '#services' },
    { label: 'Dự Án', href: '#projects' },
    { label: 'Liên Hệ', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-xl">HP</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">HOÀNG PHÚC</h1>
              <p className="text-xs text-slate-500 font-medium tracking-widest">GLASS CONSTRUCTION</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-slate-600 hover:text-primary font-medium transition-colors duration-200"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
             <a href={`tel:${COMPANY_INFO.phone.replace(/\s/g, '')}`} className="flex items-center text-slate-600 hover:text-primary transition-colors">
                <Phone size={18} className="mr-2" />
                <span className="font-semibold">{COMPANY_INFO.phone}</span>
             </a>
             <button className="bg-primary text-white px-5 py-2.5 rounded-full font-medium hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">
               Nhận Báo Giá
             </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-600 hover:text-primary focus:outline-none p-2"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl">
          <div className="px-4 pt-2 pb-6 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block px-3 py-4 text-base font-medium text-slate-700 hover:text-primary hover:bg-slate-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="mt-4 px-3">
               <a 
                href={`tel:${COMPANY_INFO.phone.replace(/\s/g, '')}`}
                className="flex items-center justify-center w-full bg-slate-100 text-slate-800 py-3 rounded-lg font-bold mb-2"
               >
                 <Phone size={18} className="mr-2" />
                 {COMPANY_INFO.phone}
               </a>
               <button className="w-full bg-primary text-white py-3 rounded-lg font-bold shadow-md">
                 Nhận Báo Giá Ngay
               </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};