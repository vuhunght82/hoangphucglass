

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4 transform animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 border-4 border-red-200">
            <AlertTriangle size={32} className="text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
          <p className="text-slate-500 mb-8">{message}</p>

          <div className="flex justify-center gap-4 w-full">
            <button 
              onClick={onClose}
              className="px-8 py-3 rounded-full text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold transition w-full"
            >
              Hủy
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-8 py-3 rounded-full bg-red-600 text-white font-bold shadow-lg shadow-red-500/30 hover:bg-red-700 transition w-full"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};