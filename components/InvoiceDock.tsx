
import React from 'react';
import { FileText, X } from 'lucide-react';
import { InvoiceFormInstance } from '../types';

interface Props {
  isSidebarOpen: boolean;
  forms: InvoiceFormInstance[];
  activeFormId: string | null;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

export const InvoiceDock: React.FC<Props> = ({ isSidebarOpen, forms, activeFormId, onActivate, onClose }) => {
  if (forms.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 right-0 h-12 bg-slate-200 border-t border-slate-300 z-[60] flex items-center px-2 gap-2 transition-all duration-200 ${isSidebarOpen ? 'left-60' : 'left-0'}`}>
      {forms.map(form => {
        const isActive = form.id === activeFormId;
        const displayName = form.invoice ? form.invoice.id : 'Hóa Đơn Mới';

        return (
          <div
            key={form.id}
            onClick={() => onActivate(form.id)}
            className={`flex items-center justify-between h-full px-4 rounded-t-lg cursor-pointer transition-colors max-w-xs ${
              isActive ? 'bg-white shadow-inner' : 'bg-slate-300 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center overflow-hidden">
              <FileText size={16} className={`mr-2 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-600'}`} />
              <span className="text-sm font-medium text-slate-800 truncate">{displayName}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose(form.id);
              }}
              className="ml-2 p-1 rounded-full text-slate-500 hover:bg-red-200 hover:text-red-700"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
