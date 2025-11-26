import React from 'react';
import { PRODUCTS } from '../constants';
import { Check } from 'lucide-react';

export const ProductSection: React.FC = () => {
  return (
    <section id="products" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Sản Phẩm Nổi Bật
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Chúng tôi cung cấp đa dạng các giải pháp về kính, từ kính cường lực an toàn đến các loại kính trang trí nội thất cao cấp.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCTS.map((product) => (
            <div key={product.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-100 flex flex-col">
              <div className="relative h-56 overflow-hidden">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                  {product.category}
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                  {product.name}
                </h3>
                <p className="text-slate-600 text-sm mb-4 line-clamp-3 flex-1">
                  {product.description}
                </p>
                
                <div className="space-y-2 mb-6">
                  {product.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center text-xs text-slate-500 font-medium">
                      <Check size={14} className="text-green-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-sky-600 font-bold text-sm">
                    {product.priceRange}
                  </div>
                  <button className="text-slate-400 hover:text-sky-600 text-sm font-medium transition-colors">
                    Chi tiết &rarr;
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
           <button className="px-8 py-3 border-2 border-slate-300 text-slate-600 font-bold rounded-full hover:border-sky-500 hover:text-sky-500 transition-all">
             Xem Tất Cả Sản Phẩm
           </button>
        </div>
      </div>
    </section>
  );
};