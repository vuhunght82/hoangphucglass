import React from 'react';
import { Invoice, InvoiceItem, CompanyConfig, GoodsReceiptNote, Payment, Customer, ProcessingTicket, AppSettings, DebtSummary, LabelDesign, LabelElement } from '../types';
import { COMPANY_INFO as DEFAULT_INFO } from '../constants';

// --- Helper Functions ---

const formatDate = (dateStr?: string) => {
  try {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const d = new Date(dateStr); 
    if (isNaN(d.getTime())) return dateStr;
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
    return `${String(adjustedDate.getDate()).padStart(2, '0')}/${String(adjustedDate.getMonth() + 1).padStart(2, '0')}/${adjustedDate.getFullYear()}`;
  } catch (e) { return dateStr || ''; }
};

const formatDateFull = (dateStr: string) => {
  try {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const userTimezoneOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
    return `Ngày ${adjustedDate.getDate()} tháng ${adjustedDate.getMonth() + 1} năm ${adjustedDate.getFullYear()}`;
  } catch (e) { return dateStr || ''; }
};

const QrCodeBlock: React.FC<{ companyInfo: CompanyConfig, qrCodeContent?: string }> = ({ companyInfo, qrCodeContent }) => {
    const showQr = companyInfo.qrCodeUrl || qrCodeContent;
    if (!showQr) return null;

    return (
        <div className="text-center flex-shrink-0">
            {companyInfo.qrCodeUrl ? (
                 <img src={companyInfo.qrCodeUrl} alt="QR Code" width="100" height="100" className="mx-auto" />
            ) : qrCodeContent ? (
                <img src={`https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(qrCodeContent)}`} alt="QR Code" width="100" height="100" className="mx-auto" />
            ) : null}
            {companyInfo.bankInfo && <p className="font-bold mt-1 text-xs">{companyInfo.bankInfo}</p>}
        </div>
    );
};


const resolveContent = (
  element: LabelElement,
  invoice: Invoice,
  item: InvoiceItem,
  itemIndex: number,
  copyIndex: number,
  totalCopies: number,
  companyInfo: CompanyConfig
): string => {
  if (element.contentKey === 'custom') {
    return element.customText || '';
  }
  switch (element.contentKey) {
    case 'customerName': return invoice.customerName.toUpperCase();
    case 'productDescription': return `*${item.description}*`;
    case 'dimensions': return `${item.width}x${item.height}=${item.quantity}`;
    case 'pageNumber': return String(itemIndex + 1).padStart(2, '0');
    case 'grindingType': return item.grindingType !== 'none' ? item.grindingType.toUpperCase() : '';
    case 'itemIndex': return `${copyIndex + 1}/${totalCopies}`;
    case 'dateTime':
        const d = new Date();
        const time = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' }).replace(/\s/g, '');
        return `${formatDate(invoice.date)} ${time}`;
    case 'companyInfo': return `${(companyInfo.name || '').toUpperCase()}-${(companyInfo.phone || '').replace(/\s/g, '')}`;
    case 'invoiceId': return `*${invoice.id}*`;
    default: return `[${element.contentKey}]`;
  }
};


const LabelComponent: React.FC<{
  design: LabelDesign;
  item: InvoiceItem;
  invoice: Invoice;
  companyInfo: CompanyConfig;
  itemIndex: number;
  copyIndex: number;
  totalCopies: number;
}> = ({ design, item, invoice, companyInfo, itemIndex, copyIndex, totalCopies }) => {

    const isPageNumberCircle = (el: LabelElement) => {
        return el.contentKey === 'pageNumber';
    };

    return (
        <div style={{
            width: `${design.width}mm`,
            height: `${design.height}mm`,
            border: '0.6mm solid #000',
            borderRadius: `${design.borderRadius}mm`,
            fontFamily: 'Arial, sans-serif',
            position: 'relative',
            boxSizing: 'border-box',
            overflow: 'hidden',
            pageBreakInside: 'avoid',
        }}>
            {design.elements.map(el => {
                const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${el.x}mm`,
                    top: `${el.y}mm`,
                    boxSizing: 'border-box',
                };

                let transformOrigin = 'top left';
                if (el.type === 'text') {
                    style.textAlign = el.textAlign || 'left';
                    if (el.textAlign === 'center') {
                        transformOrigin = 'top center';
                    } else if (el.textAlign === 'right') {
                        transformOrigin = 'top right';
                    }
                }
                style.transformOrigin = transformOrigin;

                if (el.rotation) {
                    style.transform = `rotate(${el.rotation}deg)`;
                }

                if (el.type === 'text') {
                    style.fontSize = `${el.fontSize || 8}pt`;
                    style.fontWeight = el.fontWeight || 'normal';
                    style.fontStyle = el.fontStyle || 'normal';
                    style.width = `${el.width || 50}mm`;
                    style.wordBreak = 'break-word';
                }

                if (el.type === 'text') {
                    if (isPageNumberCircle(el)) {
                       return (
                          <div key={el.id} style={{
                              ...style,
                              width: '5mm', height: '5mm', borderRadius: '50%', border: '1px solid black',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
                          }}>
                              {resolveContent(el, invoice, item, itemIndex, copyIndex, totalCopies, companyInfo)}
                          </div>
                       );
                    }
                    return <div key={el.id} style={style}>{resolveContent(el, invoice, item, itemIndex, copyIndex, totalCopies, companyInfo)}</div>;
                }

                if (el.type === 'line') {
                    style.width = `${el.width}mm`;
                    style.height = `${el.height}mm`;
                    style.backgroundColor = el.backgroundColor || '#000';
                    return <div key={el.id} style={style} className="printable-line"></div>;
                }

                return null;
            })}
        </div>
    );
};


const PrintLayout: React.FC<{ title: string; id: string; date: string; deliveryDate?: string; companyInfo: CompanyConfig; settings?: AppSettings; children: React.ReactNode; footerContent: React.ReactNode; qrCodeContent?: string; }> = 
({ title, id, date, deliveryDate, companyInfo, settings, children, footerContent, qrCodeContent }) => {
    const companyNameSize = settings?.companyNameSize || 16;
    const invoiceTitleSize = settings?.invoiceTitleSize || 28;

    return (
        <div className="bg-white p-4 max-w-[210mm] mx-auto text-black font-sans text-xs">
            <header className="pb-2 mb-2">
                <div className="flex justify-between items-start"><div className="w-2/3 pr-4"><div className="flex items-start">{companyInfo.logoUrl ? <img src={companyInfo.logoUrl} alt="Logo" className="w-20 h-20 object-contain mr-3" /> : <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"><span className="text-white font-bold text-3xl">HP</span></div>}<div><h1 className="font-bold uppercase text-blue-800" style={{ fontSize: `${companyNameSize}px`, lineHeight: 1.2 }}>{companyInfo.name}</h1><p><strong>Địa chỉ:</strong> {companyInfo.address}</p><p><strong>Tel:</strong> {companyInfo.phone}</p></div></div><div className="mt-2 space-y-1"><p><strong>Ngày lập:</strong> {formatDateFull(date)}</p>{deliveryDate && <p className="bg-yellow-100 px-2 py-1 rounded inline-block"><strong>Ngày giao:</strong> {formatDate(deliveryDate)}</p>}</div></div><div className="w-1/3 text-center"><QrCodeBlock companyInfo={companyInfo} qrCodeContent={qrCodeContent} /></div></div>
                <div className="text-center mt-1"><h2 className="font-bold uppercase text-red-700" style={{ fontSize: `${invoiceTitleSize}px`, lineHeight: 1.1 }}>{title}</h2><p className="font-mono border border-black px-2 py-1 mt-1 inline-block text-sm">*{id}*</p></div>
            </header>
            <main>{children}</main>
            <footer className="pt-4">{footerContent}</footer>
        </div>
    );
};

interface PrintProps {
  invoice: any;
  type: any;
  companyInfo?: CompanyConfig;
  settings?: AppSettings;
}

export const PrintTemplate: React.FC<PrintProps> = ({ invoice: data, type, companyInfo, settings }) => {
    const info = companyInfo || { name: 'Đang tải...', address: '', phone: '' };
    const finalSettings: AppSettings = settings || { itemsPerPage: 10, companyInfo: info };
    
    if (!finalSettings.labelDesign) {
       if (type === 'label_preview' || type === 'labels') {
          return <div className="p-4 text-red-500">Thiết kế tem chưa được cấu hình trong Cài đặt.</div>;
       }
    }

    if (type === 'label_preview') {
        const { selectedItemForPreview, items } = data as Invoice & { selectedItemForPreview: InvoiceItem };
        const itemIndex = items.findIndex(i => i.id === selectedItemForPreview.id);
        return <LabelComponent design={finalSettings.labelDesign!} item={selectedItemForPreview} invoice={data} companyInfo={info} itemIndex={itemIndex} copyIndex={0} totalCopies={selectedItemForPreview.quantity} />;
    }

    if (type === 'labels') {
        const invoice = data as Invoice;
        const allLabels: React.ReactNode[] = [];
        invoice.items.forEach((item, itemIndex) => {
            for (let i = 0; i < item.quantity; i++) {
                allLabels.push(
                    <div key={`${item.id}-${i}`} style={{ pageBreakAfter: 'always' }}>
                        <LabelComponent design={finalSettings.labelDesign!} item={item} invoice={invoice} companyInfo={info} itemIndex={itemIndex} copyIndex={i} totalCopies={item.quantity} />
                    </div>
                );
            }
        });
        return <>{allLabels}</>;
    }

    switch (type) {
        case 'invoice': case 'production': case 'delivery': {
            const invoice = data as Invoice;
            const items = invoice.items || [];
            const titles = { invoice: 'PHIẾU BÁN HÀNG', production: 'LỆNH SẢN XUẤT', delivery: 'PHIẾU GIAO HÀNG' };
            const DottedField = ({ label, value, className }: { label: string, value?: string, className?: string }) => (<div className={`flex items-baseline ${className}`}><span className="font-bold w-24 flex-shrink-0">{label}:</span><span className="font-semibold border-b border-dotted border-black flex-grow min-h-[1em]">{value}</span></div>);
            const CustomerInfo = () => (<div className="mt-2 text-sm space-y-1"><DottedField label="Tên KH" value={invoice.customerName} /><div className="grid grid-cols-2 gap-x-6"><DottedField label="Địa chỉ/vị trí" value={invoice.customerAddress} /><DottedField label="Tel" value={invoice.customerPhone} /></div><DottedField label="Ghi chú" value={invoice.note} /></div>);
            const InvoiceFooter = () => (<div className="mt-2 flex justify-between items-start"><div className="w-2/3"><div className="grid grid-cols-3 gap-4 text-center"><div><p className="font-bold uppercase">Người Lập</p><p className="mt-16">{invoice.createdBy}</p></div><div><p className="font-bold uppercase">Người Giao Hàng</p><p className="mt-16">{invoice.deliveryBy}</p></div><div><p className="font-bold uppercase">Người Nhận</p><p className="italic text-xs mt-1">(Ký, ghi rõ họ tên)</p></div></div></div><div className="w-1/3 text-xs"><div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-right"><span className="font-semibold text-slate-700">Tiền hàng:</span><span className="font-semibold">{invoice.subTotal.toLocaleString('vi-VN')}</span>{invoice.transportFee > 0 && (<><span className="text-slate-600">Phí vận chuyển:</span><span>{invoice.transportFee.toLocaleString('vi-VN')}</span></>)}{invoice.discount > 0 && (<><span className="text-slate-600">Chiết khấu:</span><span className="text-red-600">-{invoice.discount.toLocaleString('vi-VN')}</span></>)}</div><div className="grid grid-cols-[auto_1fr] gap-x-2 border-t-2 border-slate-800 pt-1 mt-1 text-right"><span className="font-bold text-sm">TỔNG CỘNG</span><span className="font-bold text-sm text-red-600">{invoice.totalAmount.toLocaleString('vi-VN')}</span></div>{invoice.deposit > 0 && (<div className="grid grid-cols-[auto_1fr] gap-x-2 mt-1 text-right"><span className="text-slate-600">Trả trước:</span><span>{invoice.deposit.toLocaleString('vi-VN')}</span></div>)}<div className="grid grid-cols-[auto_1fr] gap-x-2 border-t border-dashed pt-1 mt-1 text-right"><span className="font-bold text-sm">CÒN LẠI</span><div><span className="font-bold text-sm text-red-600 bg-yellow-100 px-2 py-1 rounded">{invoice.remainingAmount.toLocaleString('vi-VN')}</span></div></div></div></div>);
            const SimpleFooter = () => (<div className="grid grid-cols-3 gap-8 text-center mt-12"><div><p className="font-bold uppercase">Người Lập</p><p className="italic mt-16">{invoice.createdBy}</p></div><div><p className="font-bold uppercase">Người Giao Hàng</p><p className="italic mt-16">{invoice.deliveryBy}</p></div><div><p className="font-bold uppercase">Người Nhận Hàng</p><p className="italic mt-16">(Ký, ghi rõ họ tên)</p></div></div>);
            const Content = () => { if (type === 'invoice') { const totalQty = items.reduce((s, i) => s + i.quantity, 0); const totalArea = items.reduce((s, i) => s + i.area, 0); const showGrinding = items.some(i => i.grindingLength > 0); const showDrilling = items.some(i => i.drillHoles > 0); const showCutouts = items.some(i => i.cutouts > 0); return (<table className="w-full border-collapse text-xs" style={{ border: '1px solid black' }}><thead><tr className="font-bold text-center"><td className="p-1 border border-black align-middle" rowSpan={2}>Stt</td><td className="p-1 border border-black align-middle" rowSpan={2} style={{ width: 'auto' }}>Tên hàng</td><td className="p-1 border border-black align-middle font-bold text-base" rowSpan={2}>Cao</td><td className="p-1 border border-black align-middle font-bold text-base" rowSpan={2}>Rộng</td><td className="p-1 border border-black align-middle font-bold text-sm" rowSpan={2}>SL</td><td className="p-1 border border-black align-middle" rowSpan={2}>M²</td><td className="p-1 border border-black align-middle" rowSpan={2} style={{width: '8%'}}>Đơn Giá</td>{showGrinding && <td className="p-1 border border-black" colSpan={3}>Mài cạnh</td>}{showDrilling && <td className="p-1 border border-black" colSpan={2}>Khoan</td>}{showCutouts && <td className="p-1 border border-black" colSpan={2}>khoét/Bo</td>}<td className="p-1 border border-black align-middle" rowSpan={2} style={{width: '10%'}}>Thành Tiền</td></tr><tr className="font-bold text-center">{showGrinding && <><td className="p-1 border border-black">k.mài</td><td className="p-1 border border-black">Mét</td><td className="p-1 border border-black">Giá</td></>}{showDrilling && <><td className="p-1 border border-black">SL</td><td className="p-1 border border-black">giá</td></>}{showCutouts && <><td className="p-1 border border-black">SL</td><td className="p-1 border border-black">giá</td></>}{" "}</tr></thead><tbody>{items.map((item, idx) => (<tr key={idx} className="text-center"><td className="p-1 border border-black">{idx + 1}</td><td className="p-1 border border-black text-left">{item.description}</td><td className="p-1 border border-black font-bold text-lg">{item.height}</td><td className="p-1 border border-black font-bold text-lg">{item.width}</td><td className="p-1 border border-black font-bold text-lg">{item.quantity}</td><td className="p-1 border border-black">{item.area.toFixed(3)}</td><td className="p-1 border border-black text-right">{item.unitPrice.toLocaleString('vi-VN')}</td>{showGrinding && <><td className="p-1 border border-black">{item.grindingType && item.grindingType !== 'none' ? item.grindingType : ''}</td><td className="p-1 border border-black">{item.grindingLength > 0 ? item.grindingLength.toFixed(3) : '0.000'}</td><td className="p-1 border border-black text-right">{item.grindingUnitPrice > 0 ? item.grindingUnitPrice.toLocaleString('vi-VN') : '0'}</td></>}{showDrilling && <><td className="p-1 border border-black">{item.drillHoles > 0 ? item.drillHoles : '0'}</td><td className="p-1 border border-black text-right">{item.drillUnitPrice > 0 ? item.drillUnitPrice.toLocaleString('vi-VN') : '0'}</td></>}{showCutouts && <><td className="p-1 border border-black">{item.cutouts > 0 ? item.cutouts : '0'}</td><td className="p-1 border border-black text-right">{item.cutoutUnitPrice > 0 ? item.cutoutUnitPrice.toLocaleString('vi-VN') : '0'}</td></>}<td className="p-1 border border-black text-right font-bold">{item.total.toLocaleString('vi-VN')}</td></tr>))}</tbody><tfoot><tr className="font-bold text-center bg-slate-100"><td className="p-1 font-normal text-right" colSpan={4}>Tổng cộng:</td><td className="p-1">{totalQty}</td><td className="p-1">{totalArea.toFixed(3)}</td><td className="p-1 text-right" colSpan={ (showGrinding ? 3 : 0) + (showDrilling ? 2 : 0) + (showCutouts ? 2 : 0) + 1}></td><td className="p-1"></td></tr></tfoot></table>); } return (<table className="w-full border-collapse border border-slate-800 text-sm mb-6"><thead><tr className="bg-slate-200"><th className="border border-slate-600 p-2 w-10">STT</th><th className="border border-slate-600 p-2">Tên Hàng & Quy Cách</th><th className="border border-slate-600 p-2 w-16">Cao</th><th className="border border-slate-600 p-2 w-16">Rộng</th><th className="border border-slate-600 p-2 w-12">SL</th><th className="border border-slate-600 p-2 w-20">M2</th>{type === 'production' && (<><th className="border border-slate-600 p-2 bg-blue-50">Mài</th><th className="border border-slate-600 p-2 bg-indigo-50">Khoan/Khoét</th></>)}</tr></thead><tbody>{items.map((item, i) => (<tr key={i}><td className="border border-slate-600 p-2 text-center">{i + 1}</td><td className="border border-slate-600 p-2 font-medium">{item.description}</td><td className="border border-slate-600 p-2 text-center font-bold">{item.height}</td><td className="border border-slate-600 p-2 text-center font-bold">{item.width}</td><td className="border border-slate-600 p-2 text-center font-bold">{item.quantity}</td><td className="border border-slate-600 p-2 text-center">{item.area.toFixed(2)}</td>{type === 'production' && (<><td className="border border-slate-600 p-2 text-center bg-blue-50/30">{item.grindingType !== 'none' ? item.grindingType : ''}</td><td className="border border-slate-600 p-2 text-center bg-indigo-50/30">{[item.drillHoles > 0 ? `${item.drillHoles} lỗ` : '', item.cutouts > 0 ? `${item.cutouts} khoét` : ''].filter(Boolean).join(', ')}</td></>)}</tr>))}<tr className="bg-slate-100 font-bold"><td className="border border-slate-600 p-2 text-right" colSpan={2}>Tổng cộng</td><td className="border border-slate-600 p-2"></td><td className="border border-slate-600 p-2"></td><td className="border border-slate-600 p-2 text-center">{items.reduce((s, i) => s + i.quantity, 0)}</td><td className="border border-slate-600 p-2 text-center">{items.reduce((s, i) => s + i.area, 0).toFixed(2)}</td>{type === 'production' && <td className="border border-slate-600 p-2" colSpan={2}></td>}</tr></tbody></table>); };
            return (<PrintLayout title={titles[type]} id={invoice.id} date={invoice.date} deliveryDate={invoice.deliveryDate} companyInfo={info} settings={settings} footerContent={type === 'invoice' ? <InvoiceFooter /> : <SimpleFooter />} qrCodeContent={invoice.qrCodeContent}><CustomerInfo /><Content /></PrintLayout>);
        }
        case 'goodsReceipt': { const note = data as GoodsReceiptNote; const Content = () => (<><div className="mt-4 text-sm"><p><strong className="w-32 inline-block">Nhà cung cấp:</strong> {note.agencyName}</p><p><strong className="w-32 inline-block">Ghi chú:</strong> {note.note}</p></div><table className="w-full border-collapse border border-slate-800 text-sm my-4"><thead><tr className="bg-slate-200"><th className="border border-slate-600 p-2 w-10">STT</th><th className="border border-slate-600 p-2">Tên Hàng</th><th className="border border-slate-600 p-2">Kích thước (mm)</th><th className="border border-slate-600 p-2">Tấm/Kiện</th><th className="border border-slate-600 p-2">Số Kiện</th><th className="border border-slate-600 p-2">Tổng Tấm</th><th className="border border-slate-600 p-2">Đơn Giá (m²)</th><th className="border border-slate-600 p-2">Thành Tiền</th></tr></thead><tbody>{note.items.map((item, i) => (<tr key={i}><td className="border border-slate-600 p-2 text-center">{i + 1}</td><td className="border border-slate-600 p-2">{item.description}</td><td className="border border-slate-600 p-2 text-center">{item.hs1} x {item.hs2}</td><td className="border border-slate-600 p-2 text-center">{item.sheetsPerPack}</td><td className="border border-slate-600 p-2 text-center">{item.packs}</td><td className="border border-slate-600 p-2 text-center font-bold">{item.quantity}</td><td className="border border-slate-600 p-2 text-right">{item.unitPrice.toLocaleString('vi-VN')}</td><td className="border border-slate-600 p-2 text-right font-bold">{item.total.toLocaleString('vi-VN')}</td></tr>))}</tbody><tfoot><tr className="bg-slate-100 font-bold"><td className="p-2 text-right" colSpan={7}>TỔNG CỘNG</td><td className="p-2 text-right">{note.totalAmount.toLocaleString('vi-VN')}</td></tr></tfoot></table></>); const Footer = () => (<div className="grid grid-cols-3 gap-8 text-center mt-12"><div><p className="font-bold uppercase">Người Giao</p><p className="mt-24">{note.deliveredBy}</p></div><div><p className="font-bold uppercase">Thủ Kho</p><p className="mt-24">{note.receivedBy}</p></div><div><p className="font-bold uppercase">Người Lập Phiếu</p><p className="mt-24">{note.createdBy}</p></div></div>); return (<PrintLayout title="PHIẾU NHẬP HÀNG" id={note.id} date={note.date} companyInfo={info} settings={settings} footerContent={<Footer />}><Content /></PrintLayout>); }
        case 'processingTicket': case 'processingTicketInternal': case 'processingTicketExternal': { const ticket = data as ProcessingTicket; const isInternal = type === 'processingTicketInternal'; const totalGrindingLength = ticket.items.reduce((sum, item) => { const h = item.height || 0; const w = item.width || 0; const qty = item.quantity || 0; if (h === 0 || w === 0 || qty === 0 || !item.grindingType || item.grindingType === 'none') return sum; const perimeter = (h + w) * 2; let grindingLen = 0; switch (item.grindingType) { case '4c': grindingLen = (perimeter * qty) / 1000; break; case '2d': grindingLen = (Math.max(h, w) * 2 * qty) / 1000; break; case '2n': grindingLen = (Math.min(h, w) * 2 * qty) / 1000; break; case '1d': grindingLen = (Math.max(h, w) * qty) / 1000; break; case '1n': grindingLen = (Math.min(h, w) * qty) / 1000; break; } return sum + grindingLen; }, 0); const Content = () => (<><div className="mt-4 text-sm"><p><strong className="w-32 inline-block">Đơn vị gia công:</strong> {ticket.processingUnitName}</p>{!isInternal && <p><strong className="w-32 inline-block">Ghi chú:</strong> {ticket.note}</p>}</div><table className="w-full border-collapse border border-slate-800 text-sm my-4"><thead><tr className="bg-slate-200 font-bold"><th className="border border-slate-600 p-2">STT</th><th className="border border-slate-600 p-2">Tên Hàng</th><th className="border border-slate-600 p-2">Cao</th><th className="border border-slate-600 p-2">Rộng</th><th className="border border-slate-600 p-2">Số Tấm</th><th className="border border-slate-600 p-2">Gia Công</th><th className="border border-slate-600 p-2">Kiểu Mài</th><th className="border border-slate-600 p-2">Mét Mài</th>{!isInternal && <th className="border border-slate-600 p-2">Ghi Chú</th>}{isInternal && <th className="border border-slate-600 p-2">Đơn Giá</th>}{isInternal && <th className="border border-slate-600 p-2">Thành Tiền</th>}</tr></thead><tbody>{ticket.items.map((item, i) => { const h = item.height || 0; const w = item.width || 0; const qty = item.quantity || 0; let grindingLen = 0; if (item.grindingType && item.grindingType !== 'none') { const perimeter = (h + w) * 2; switch (item.grindingType) { case '4c': grindingLen = (perimeter * qty) / 1000; break; case '2d': grindingLen = (Math.max(h, w) * 2 * qty) / 1000; break; case '2n': grindingLen = (Math.min(h, w) * 2 * qty) / 1000; break; case '1d': grindingLen = (Math.max(h, w) * qty) / 1000; break; case '1n': grindingLen = (Math.min(h, w) * qty) / 1000; break; } } return (<tr key={i}><td className="border border-slate-600 p-2 text-center">{i + 1}</td><td className="border border-slate-600 p-2">{item.description}</td><td className="border border-slate-600 p-2 text-center">{item.height}</td><td className="border border-slate-600 p-2 text-center">{item.width}</td><td className="border border-slate-600 p-2 text-center">{item.quantity}</td><td className="border border-slate-600 p-2 text-center">{item.processingType}</td><td className="border border-slate-600 p-2 text-center">{item.grindingType}</td><td className="border border-slate-600 p-2 text-center">{grindingLen > 0 ? grindingLen.toFixed(3) : ''}</td>{!isInternal && <td className="border border-slate-600 p-2">{item.notes}</td>}{isInternal && <td className="border border-slate-600 p-2 text-right">{(item.unitPrice || 0).toLocaleString()}</td>}{isInternal && <td className="border border-slate-600 p-2 text-right font-bold">{(item.total || 0).toLocaleString()}</td>}</tr>)})}</tbody></table><div className="flex justify-end mt-4"><div className="w-1/3 space-y-1 text-sm font-semibold"><div className="flex justify-between"><span className="text-slate-600">Tổng số tấm:</span><span>{ticket.totalQuantity}</span></div><div className="flex justify-between"><span className="text-slate-600">Tổng M2:</span><span>{ticket.totalArea.toFixed(3)}</span></div><div className="flex justify-between"><span className="text-slate-600">Tổng mét mài:</span><span>{totalGrindingLength.toFixed(3)}</span></div>{isInternal && <div className="flex justify-between pt-2 border-t mt-2 text-base font-bold"><span className="text-slate-800">TỔNG TIỀN:</span><span className="text-red-600">{(ticket.totalAmount || 0).toLocaleString()}đ</span></div>}</div></div></>); const Footer = () => (<div className="grid grid-cols-2 gap-8 text-center mt-12"><div><p className="font-bold uppercase">Người Lập Phiếu</p></div><div><p className="font-bold uppercase">Xác nhận ĐV Gia Công</p></div></div>); return (<PrintLayout title="PHIẾU GIA CÔNG" id={ticket.id} date={ticket.date} companyInfo={info} settings={settings} footerContent={<Footer />}><Content /></PrintLayout>); }
        case 'debtSummary': { const summary = data as DebtSummary; let runningBalance = summary.openingBalance; const periodId = summary.id; const [year, monthStr] = periodId.split('-'); const periodTitle = `Tháng ${monthStr}/${year}`; return (<PrintLayout title="BÁO CÁO CÔNG NỢ" id={periodTitle} date={summary.generatedAt} companyInfo={info} settings={settings} footerContent={<div></div>}><div className="mt-4 text-sm space-y-1"><p><strong className="w-32 inline-block">Khách hàng:</strong> {summary.customerName}</p><p><strong className="w-32 inline-block">Kỳ báo cáo:</strong> {formatDate(summary.startDate)} - {formatDate(summary.endDate)}</p></div><div className="grid grid-cols-4 gap-4 my-4 text-center"><div className="bg-slate-100 p-2 rounded"><strong>Nợ đầu kỳ:</strong><br/>{summary.openingBalance.toLocaleString()}đ</div><div className="bg-green-100 p-2 rounded"><strong>Phát sinh:</strong><br/>{summary.totalNewDebt.toLocaleString()}đ</div><div className="bg-blue-100 p-2 rounded"><strong>Đã thanh toán:</strong><br/>{summary.totalPayments.toLocaleString()}đ</div><div className="bg-red-100 p-2 rounded"><strong>Nợ cuối kỳ:</strong><br/>{summary.closingBalance.toLocaleString()}đ</div></div><table className="w-full border-collapse border border-slate-800 text-sm my-4"><thead><tr className="bg-slate-200"><th className="border border-slate-600 p-2">STT</th><th className="border border-slate-600 p-2">Ngày</th><th className="border border-slate-600 p-2">Số chứng từ</th><th className="border border-slate-600 p-2">Diễn giải</th><th className="border border-slate-600 p-2 text-right">Phát sinh nợ</th><th className="border border-slate-600 p-2 text-right">Thanh toán</th><th className="border border-slate-600 p-2 text-right">Số dư</th></tr></thead><tbody><tr><td className="p-2 font-bold text-center" colSpan={1}></td><td colSpan={5} className="p-2 font-bold">Số dư đầu kỳ</td><td className="p-2 text-right font-bold">{summary.openingBalance.toLocaleString()}đ</td></tr>{summary.transactions.map((tx, i) => { runningBalance += tx.balanceChange; return (<tr key={i}><td className="border border-slate-600 p-2 text-center">{i + 1}</td><td className="border border-slate-600 p-2 text-center">{formatDate(tx.date)}</td><td className="border border-slate-600 p-2">{tx.type === 'invoice' ? tx.description.replace('Hóa đơn #', '') : ''}</td><td className="border border-slate-600 p-2">{tx.description}</td><td className="border border-slate-600 p-2 text-right">{tx.type === 'invoice' ? tx.amount.toLocaleString()+'đ' : ''}</td><td className="border border-slate-600 p-2 text-right">{tx.type === 'payment' ? tx.amount.toLocaleString()+'đ' : ''}</td><td className="border border-slate-600 p-2 text-right">{runningBalance.toLocaleString()}đ</td></tr>)})}</tbody><tfoot><tr className="bg-slate-100 font-bold"><td colSpan={4} className="p-2 text-right">Tổng cộng</td><td className="p-2 text-right">{summary.totalNewDebt.toLocaleString()}đ</td><td className="p-2 text-right">{summary.totalPayments.toLocaleString()}đ</td><td className="p-2 text-right">{summary.closingBalance.toLocaleString()}đ</td></tr></tfoot></table></PrintLayout>); }
        case 'paymentStatement': { const { customer, invoices, payments } = data as { customer: Customer, invoices: Invoice[], payments: Payment[] }; const invoiceTransactions: any[] = invoices.map(inv => ({ date: inv.date, type: 'invoice', description: `Hóa đơn #${inv.id}`, docId: inv.id, debit: inv.totalAmount, credit: 0 })); const paymentTransactions: any[] = payments.map(p => { const isPayment = p.type === 'payment'; const isPositiveAdjustment = p.type === 'debt_adjustment' && p.amount > 0; const isNegativeAdjustment = p.type === 'debt_adjustment' && p.amount < 0; return { date: p.date, type: p.type, description: p.note || (isPayment ? `Thanh toán (${p.method})` : 'Điều chỉnh'), docId: p.id, debit: isPositiveAdjustment ? p.amount : 0, credit: isPayment ? p.amount : (isNegativeAdjustment ? -p.amount : 0) } }); const allTransactions = [...invoiceTransactions, ...paymentTransactions]; allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); let runningBalance = 0; const totalDebit = allTransactions.reduce((sum, tx) => sum + tx.debit, 0); const totalCredit = allTransactions.reduce((sum, tx) => sum + tx.credit, 0); const closingBalance = totalDebit - totalCredit; const Footer = () => (<div className="grid grid-cols-3 gap-8 text-center mt-12 pt-8"><div><p className="font-bold uppercase">Người Lập</p></div><div><p className="font-bold uppercase">Kế toán</p></div><div><p className="font-bold uppercase">Khách hàng</p><p className="italic text-xs mt-1">(Ký, ghi rõ họ tên)</p></div></div>); return (<PrintLayout title="ĐỐI SOÁT CÔNG NỢ" id={customer.code} date={new Date().toISOString()} companyInfo={info} settings={settings} footerContent={<Footer />}><div className="mt-4 text-sm space-y-1"><p><strong className="w-32 inline-block">Khách hàng:</strong> {customer.name}</p><p><strong className="w-32 inline-block">Địa chỉ:</strong> {customer.address}</p><p><strong className="w-32 inline-block">Điện thoại:</strong> {customer.phone}</p></div><div className="grid grid-cols-3 gap-4 my-4 text-center"><div className="bg-green-100 p-2 rounded"><strong>Tổng phát sinh:</strong><br/>{totalDebit.toLocaleString()}đ</div><div className="bg-blue-100 p-2 rounded"><strong>Đã thanh toán:</strong><br/>{totalCredit.toLocaleString()}đ</div><div className="bg-red-100 p-2 rounded"><strong>Còn lại:</strong><br/>{closingBalance.toLocaleString()}đ</div></div><table className="w-full border-collapse border border-slate-800 text-sm my-4"><thead><tr className="bg-slate-200"><th className="border border-slate-600 p-2">STT</th><th className="border border-slate-600 p-2">Ngày</th><th className="border border-slate-600 p-2">Số CT</th><th className="border border-slate-600 p-2">Diễn giải</th><th className="border border-slate-600 p-2 text-right">Phát sinh nợ</th><th className="border border-slate-600 p-2 text-right">Thanh toán</th><th className="border border-slate-600 p-2 text-right">Số dư</th></tr></thead><tbody>{allTransactions.map((tx, i) => { runningBalance += (tx.debit || 0) - (tx.credit || 0); return (<tr key={i}><td className="border border-slate-600 p-2 text-center">{i + 1}</td><td className="border border-slate-600 p-2 text-center">{formatDate(tx.date)}</td><td className="border border-slate-600 p-2">{tx.docId}</td><td className="border border-slate-600 p-2">{tx.description}</td><td className="border border-slate-600 p-2 text-right">{tx.debit > 0 ? tx.debit.toLocaleString()+'đ' : ''}</td><td className="border border-slate-600 p-2 text-right">{tx.credit > 0 ? tx.credit.toLocaleString()+'đ' : ''}</td><td className="border border-slate-600 p-2 text-right">{runningBalance.toLocaleString()}đ</td></tr>)})}</tbody><tfoot><tr className="bg-slate-100 font-bold"><td colSpan={4} className="p-2 text-right">Tổng cộng</td><td className="p-2 text-right">{totalDebit.toLocaleString()}đ</td><td className="p-2 text-right">{totalCredit.toLocaleString()}đ</td><td className="p-2 text-right">{closingBalance.toLocaleString()}đ</td></tr></tfoot></table></PrintLayout>); }
        default: return (<PrintLayout title="Loại in không xác định" id="" date={new Date().toISOString()} companyInfo={info} footerContent={<div/>}><div className="text-center p-8">Vui lòng chọn một loại phiếu in hợp lệ.</div></PrintLayout>);
    }
};