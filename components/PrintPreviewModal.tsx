
import React from 'react';
import { X, Printer } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  title: string;
  children: React.ReactNode;
}

export const PrintPreviewModal: React.FC<Props> = ({ isOpen, onClose, onPrint, title, children }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* This is the modal UI. */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
          <header className="flex-shrink-0 p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><X size={20} /></button>
          </header>

          <main className="flex-1 bg-slate-200 p-4 overflow-auto flex justify-center">
            {/* This wrapper is for visual styling of the preview inside the modal */}
            <div className="bg-white p-2 shadow-lg">
              {/* The ID is added here to grab the innerHTML for printing */}
              <div id="print-preview-content">
                {children}
              </div>
            </div>
          </main>

          <footer className="flex-shrink-0 p-4 border-t flex justify-end items-center bg-slate-50 rounded-b-2xl">
            <button onClick={onClose} className="px-6 py-2 rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold mr-4">
              Hủy
            </button>
            <button onClick={onPrint} className="bg-blue-600 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
              <Printer size={20} /> In Ấn
            </button>
          </footer>
        </div>
      </div>
    </>
  );
};
