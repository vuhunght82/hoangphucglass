
import React, { useState } from 'react';
import { Invoice, InvoiceItem, AppSettings } from '../types';
import { PrintTemplate } from './PrintTemplates';
import { X, Printer } from 'lucide-react';

interface Props {
  invoice: Invoice;
  settings: AppSettings;
  onClose: () => void;
  onPrint: (data: any, type: string) => void;
}

export const LabelPrintManager: React.FC<Props> = ({ invoice, settings, onClose, onPrint }) => {
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);

  const handlePrintAll = () => {
    onPrint(invoice, 'labels');
  };

  const selectedItem = invoice.items[selectedItemIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
        <header className="flex-shrink-0 p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-800">In Tem Dán cho Hóa đơn: {invoice.id}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200"><X size={20} /></button>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Item List */}
          <aside className="w-1/3 border-r overflow-y-auto p-2 space-y-1">
            <h3 className="font-semibold p-2">Sản phẩm ({invoice.items.length})</h3>
            {invoice.items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setSelectedItemIndex(index)}
                className={`p-3 rounded-lg cursor-pointer ${selectedItemIndex === index ? 'bg-blue-100 text-blue-800' : 'hover:bg-slate-100'}`}
              >
                <p className="font-bold">{item.description}</p>
                <p className="text-sm text-slate-600">Kích thước: {item.height} x {item.width} | Số lượng: {item.quantity}</p>
              </div>
            ))}
          </aside>

          {/* Right: Preview */}
          <main className="w-2/3 flex flex-col items-center justify-center bg-slate-200 p-4 overflow-auto">
            <h3 className="font-semibold mb-2">Xem trước tem</h3>
            <div className="bg-white p-2 shadow-lg">
              {selectedItem && settings.companyInfo && (
                <PrintTemplate
                  invoice={{ ...invoice, selectedItemForPreview: selectedItem }}
                  type={`label_preview`}
                  companyInfo={settings.companyInfo}
                  settings={settings}
                />
              )}
            </div>
          </main>
        </div>

        <footer className="flex-shrink-0 p-4 border-t flex justify-between items-center bg-slate-50 rounded-b-2xl">
          {settings.defaultLabelPrinter && (
            <div className="text-sm text-slate-600 bg-yellow-100 border border-yellow-300 px-4 py-2 rounded-lg">
                <strong>Gợi ý:</strong> Hãy chọn máy in <strong>"{settings.defaultLabelPrinter}"</strong> trong hộp thoại in.
            </div>
           )}
          <button onClick={handlePrintAll} className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-blue-700 ml-auto">
            <Printer size={20} /> In tất cả tem ({invoice.items.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </footer>
      </div>
    </div>
  );
};
