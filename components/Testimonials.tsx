import React from 'react';
import { TESTIMONIALS } from '../constants';
import { Quote } from 'lucide-react';

export const Testimonials: React.FC = () => {
  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Decoration */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-sky-100 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-slate-100 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 opacity-50"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Khách Hàng Nói Về Chúng Tôi</h2>
          <div className="w-20 h-1 bg-sky-500 mx-auto rounded-full"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((item) => (
            <div key={item.id} className="bg-slate-50 rounded-2xl p-8 border border-slate-100 relative">
              <Quote size={40} className="text-sky-200 absolute top-6 right-6" />
              <p className="text-slate-600 italic mb-6 relative z-10">
                "{item.content}"
              </p>
              <div className="flex items-center">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-12 h-12 rounded-full object-cover mr-4 border-2 border-white shadow-sm"
                />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                  <p className="text-sky-600 text-xs font-medium">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};