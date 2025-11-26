
import React, { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { AppSettings, GrindingType, LabelDesign } from '../types';
import { db } from '../services/db';
import { Settings, Plus, Edit, Trash2, Check, X, Save, Upload, Wand2, LayoutTemplate } from 'lucide-react';
import { LabelDesigner } from './LabelDesigner';


const ImageUploader: React.FC<{ label: string; imageUrl?: string; onImageChange: (base64: string) => void; }> = ({ label, imageUrl, onImageChange }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => { onImageChange(reader.result as string); };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <label className="text-sm font-bold">{label}</label>
            <div className="flex items-center gap-4 mt-2">
                <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden">{imageUrl ? <img src={imageUrl} alt={label} className="w-full h-full object-contain" /> : <span className="text-xs text-slate-400">Chưa có ảnh</span>}</div>
                <input type="file" accept="image/*" id={`upload-${label}`} className="hidden" onChange={handleFileChange} />
                <label htmlFor={`upload-${label}`} className="cursor-pointer bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center text-sm hover:bg-slate-200 transition-colors"><Upload size={16} className="mr-2" /> Tải Lên</label>
            </div>
        </div>
    );
};

export const SettingsView: React.FC<{ onSettingsChange: () => void }> = ({ onSettingsChange }) => {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [grindingTypes, setGrindingTypes] = useState<GrindingType[]>([]);
    const [saving, setSaving] = useState(false);
    
    const [newAttr, setNewAttr] = useState('');
    const [newCustGroup, setNewCustGroup] = useState('');
    const [newProcGroup, setNewProcGroup] = useState('');
    const [editingGroup, setEditingGroup] = useState<{ type: 'customer' | 'processing' | 'product', index: number, value: string } | null>(null);
    const [newGrindingType, setNewGrindingType] = useState<Partial<GrindingType>>({ code: '', name: '', pricePerMeter: 0 });
    const [editingGrindingType, setEditingGrindingType] = useState<GrindingType | null>(null);

    useEffect(() => {
        const load = async () => {
            const [s, g] = await Promise.all([db.getAppSettings(), db.getGrindingSettings()]);
            setSettings(s);
            setGrindingTypes(g);
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        await Promise.all([db.saveAppSettings(settings), db.saveGrindingSettings(grindingTypes)]);
        setSaving(false);
        showToast('Đã lưu cài đặt thành công', 'success');
        onSettingsChange();
    };
    
    const addAttr = (type: 'product' | 'customer' | 'processing') => {
        if (!settings) return;
        if (type === 'product') { if (!newAttr.trim() || (settings.productAttributes || []).includes(newAttr.trim())) return; setSettings({ ...settings, productAttributes: [...(settings.productAttributes || []), newAttr.trim()] }); setNewAttr(''); } 
        else if (type === 'customer') { if (!newCustGroup.trim() || (settings.customerTradeGroups || []).includes(newCustGroup.trim())) return; setSettings({ ...settings, customerTradeGroups: [...(settings.customerTradeGroups || []), newCustGroup.trim()] }); setNewCustGroup(''); } 
        else if (type === 'processing') { if (!newProcGroup.trim() || (settings.processingUnitTradeGroups || []).includes(newProcGroup.trim())) return; setSettings({ ...settings, processingUnitTradeGroups: [...(settings.processingUnitTradeGroups || []), newProcGroup.trim()] }); setNewProcGroup(''); }
    };

    const removeAttr = (attr: string, type: 'product' | 'customer' | 'processing') => {
        if (!settings) return;
        if (type === 'product') setSettings({ ...settings, productAttributes: (settings.productAttributes || []).filter(a => a !== attr) });
        else if (type === 'customer') setSettings({ ...settings, customerTradeGroups: (settings.customerTradeGroups || []).filter(a => a !== attr) });
        else if (type === 'processing') setSettings({ ...settings, processingUnitTradeGroups: (settings.processingUnitTradeGroups || []).filter(a => a !== attr) });
    };

    const handleStartEdit = (type: 'customer' | 'processing' | 'product', index: number, currentValue: string) => setEditingGroup({ type, index, value: currentValue });
    const handleCancelEdit = () => setEditingGroup(null);
    const handleSaveEdit = () => {
        if (!editingGroup || !settings) return;
        const { type, index, value } = editingGroup;
        if (!value.trim()) { showToast("Tên không được để trống", "error"); return; }
        const updateGroups = (currentGroups: string[]) => { if (currentGroups.filter((g, i) => i !== index).includes(value.trim())) { showToast("Tên đã tồn tại", "error"); return currentGroups; } const newGroups = [...currentGroups]; newGroups[index] = value.trim(); return newGroups; };
        if (type === 'customer') setSettings({ ...settings, customerTradeGroups: updateGroups(settings.customerTradeGroups || []) });
        else if (type === 'processing') setSettings({ ...settings, processingUnitTradeGroups: updateGroups(settings.processingUnitTradeGroups || []) });
        else if (type === 'product') setSettings({ ...settings, productAttributes: updateGroups(settings.productAttributes || []) });
        setEditingGroup(null);
    };
    
    const updateCompanyInfo = (field: string, value: string | number) => {
        if (!settings) return;
        setSettings({ ...settings, companyInfo: { ...settings.companyInfo!, [field]: value } });
    };

    const handleLabelDesignChange = (newDesign: LabelDesign) => {
        if (!settings) return;
        setSettings({ ...settings, labelDesign: newDesign });
    };

    const handleAddGrindingType = () => { if (!newGrindingType.code || !newGrindingType.name) { showToast('Mã và Tên kiểu mài không được để trống.', 'error'); return; } if (grindingTypes.some(g => g.code === newGrindingType.code)) { showToast('Mã kiểu mài đã tồn tại.', 'error'); return; } const newType: GrindingType = { id: `g_${Date.now()}`, code: newGrindingType.code.trim(), name: newGrindingType.name.trim(), pricePerMeter: newGrindingType.pricePerMeter || 0, }; setGrindingTypes([...grindingTypes, newType]); setNewGrindingType({ code: '', name: '', pricePerMeter: 0 }); };
    const handleRemoveGrindingType = (id: string) => setGrindingTypes(grindingTypes.filter(g => g.id !== id));
    const handleStartEditGrindingType = (type: GrindingType) => setEditingGrindingType({ ...type });
    const handleCancelEditGrindingType = () => setEditingGrindingType(null);
    const handleSaveEditGrindingType = () => { if (!editingGrindingType) return; setGrindingTypes(grindingTypes.map(g => g.id === editingGrindingType.id ? editingGrindingType : g)); setEditingGrindingType(null); };

    const TradeGroupManager: React.FC<{ title: string; groups: string[]; inputValue: string; onInputChange: (val: string) => void; onAdd: () => void; onRemove: (group: string) => void; type: 'customer' | 'processing' | 'product'; }> = 
    ({ title, groups, inputValue, onInputChange, onAdd, onRemove, type }) => (<div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-lg font-bold text-blue-800 mb-4">{title}</h3><div className="flex gap-2 mb-3"><input type="text" placeholder="Nhập tên..." value={inputValue} onChange={e => onInputChange(e.target.value)} className="flex-1 p-2 rounded-lg border outline-none focus:border-blue-500" /><button onClick={onAdd} className="bg-blue-600 text-white px-4 rounded-lg font-bold"><Plus size={20} /></button></div><div className="flex flex-wrap gap-2 border p-4 rounded-xl bg-slate-50 min-h-[80px]">{(groups || []).map((group, idx) => (<div key={idx} className="group bg-white border border-blue-200 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm font-medium h-8">{editingGroup && editingGroup.type === type && editingGroup.index === idx ? (<><input type="text" value={editingGroup.value} onChange={(e) => setEditingGroup({ ...editingGroup, value: e.target.value })} className="bg-transparent outline-none w-24 text-sm" autoFocus /><button onClick={handleSaveEdit} className="ml-2 text-green-500"><Check size={16} /></button><button onClick={handleCancelEdit} className="ml-1 text-red-500"><X size={16} /></button></>) : (<><span>{group}</span><div className="flex items-center ml-2"><button onClick={() => handleStartEdit(type, idx, group)} className="text-blue-400 hover:text-blue-700 opacity-0 group-hover:opacity-100"><Edit size={14} /></button><button onClick={() => onRemove(group)} className="ml-1 text-blue-400 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button></div></>)}</div>))}</div></div>);

    if (!settings) {
        return <div className="p-8 text-center">Đang tải cài đặt...</div>;
    }

    return (
        <div className="px-6 pt-4 pb-6 space-y-8">
            <h2 className="text-2xl font-bold text-blue-900 flex items-center"><Settings className="mr-2" /> Cài Đặt Hệ Thống</h2>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-xl font-bold text-blue-800 mb-4 flex items-center"><LayoutTemplate size={20} className="mr-3"/> Trình Thiết Kế Tem Dán</h3>
                {settings.labelDesign && <LabelDesigner design={settings.labelDesign} onChange={handleLabelDesignChange} />}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-lg font-bold text-blue-800 mb-4">Thông Tin Doanh Nghiệp</h3><div className="space-y-3"><div><label className="text-sm font-bold">Tên Công Ty</label><input type="text" value={settings.companyInfo?.name || ''} onChange={e => updateCompanyInfo('name', e.target.value)} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div><label className="text-sm font-bold">Địa Chỉ</label><input type="text" value={settings.companyInfo?.address || ''} onChange={e => updateCompanyInfo('address', e.target.value)} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-bold">Điện Thoại</label><input type="text" value={settings.companyInfo?.phone || ''} onChange={e => updateCompanyInfo('phone', e.target.value)} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div><label className="text-sm font-bold">Email</label><input type="text" value={settings.companyInfo?.email || ''} onChange={e => updateCompanyInfo('email', e.target.value)} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div></div><div><label className="text-sm font-bold">Thông tin ngân hàng</label><textarea value={settings.companyInfo?.bankInfo || ''} onChange={e => updateCompanyInfo('bankInfo', e.target.value)} className="w-full p-2 border rounded-lg mt-1 h-20 outline-none focus:border-blue-500" placeholder="Tên NH - Số TK - Chủ TK"></textarea></div><div className="grid grid-cols-2 gap-4 pt-4 border-t"><ImageUploader label="Logo Công Ty" imageUrl={settings.companyInfo?.logoUrl} onImageChange={(base64) => updateCompanyInfo('logoUrl', base64)} /><ImageUploader label="Mã QR Thanh Toán" imageUrl={settings.companyInfo?.qrCodeUrl} onImageChange={(base64) => updateCompanyInfo('qrCodeUrl', base64)} /></div></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-lg font-bold text-blue-800 mb-4">Cài đặt hiển thị</h3><div className="space-y-3"><div><label className="text-sm font-bold">Số dòng trên mỗi trang</label><p className="text-xs text-slate-500 mb-1">Áp dụng cho danh sách hóa đơn, khách hàng, v.v.</p><input type="number" value={settings.itemsPerPage || 10} onChange={e => setSettings({ ...settings, itemsPerPage: Number(e.target.value) })} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div><label className="text-sm font-bold">Cỡ chữ Tên Công ty (trên HĐ in)</label><input type="number" value={settings.companyNameSize || 24} onChange={e => setSettings({ ...settings, companyNameSize: Number(e.target.value) })} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div><label className="text-sm font-bold">Cỡ chữ Tiêu đề Hóa đơn (trên HĐ in)</label><input type="number" value={settings.invoiceTitleSize || 36} onChange={e => setSettings({ ...settings, invoiceTitleSize: Number(e.target.value) })} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div><div className="mt-4"><label className="text-sm font-bold">Tên máy in tem mặc định</label><p className="text-xs text-slate-500 mb-1">Nhập chính xác tên máy in nhiệt của bạn. Tên này sẽ được hiển thị như một lời nhắc khi bạn in tem.</p><input type="text" placeholder="VD: Xprinter XP-365B" value={settings.defaultLabelPrinter || ''} onChange={e => setSettings({ ...settings, defaultLabelPrinter: e.target.value })} className="w-full p-2 border rounded-lg mt-1 outline-none focus:border-blue-500" /></div></div></div>
                </div>
                <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"><h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center"><Wand2 size={20} className="mr-2"/> Quản lý Kiểu Mài</h3><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-2 font-semibold text-left">Mã</th><th className="p-2 font-semibold text-left">Tên Kiểu Mài</th><th className="p-2 font-semibold text-right">Đơn giá (md)</th><th className="p-2 font-semibold text-center">Hành động</th></tr></thead><tbody>{grindingTypes.map(g => (<tr key={g.id} className="border-t">{editingGrindingType?.id === g.id ? (<><td className="p-1"><input type="text" value={editingGrindingType.code} onChange={e => setEditingGrindingType({...editingGrindingType, code: e.target.value})} className="w-full p-1.5 rounded border"/></td><td className="p-1"><input type="text" value={editingGrindingType.name} onChange={e => setEditingGrindingType({...editingGrindingType, name: e.target.value})} className="w-full p-1.5 rounded border"/></td><td className="p-1"><input type="number" value={editingGrindingType.pricePerMeter} onChange={e => setEditingGrindingType({...editingGrindingType, pricePerMeter: Number(e.target.value)})} className="w-full p-1.5 rounded border text-right"/></td><td className="p-1 text-center flex gap-1 justify-center"><button onClick={handleSaveEditGrindingType} className="p-2 text-green-600 hover:bg-green-100 rounded"><Check size={18} /></button><button onClick={handleCancelEditGrindingType} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><X size={18} /></button></td></>) : (<><td className="p-2 font-mono">{g.code}</td><td className="p-2 font-semibold">{g.name}</td><td className="p-2 text-right">{g.pricePerMeter.toLocaleString()}</td><td className="p-2 text-center flex gap-1 justify-center"><button onClick={() => handleStartEditGrindingType(g)} className="p-2 text-blue-600 hover:bg-blue-100 rounded"><Edit size={16} /></button><button onClick={() => handleRemoveGrindingType(g.id)} className="p-2 text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button></td></>)}</tr>))}</tbody><tfoot className="bg-slate-50"><tr className="border-t-2"><td className="p-2"><input type="text" placeholder="Mã (vd: 2d)" value={newGrindingType.code || ''} onChange={e => setNewGrindingType({...newGrindingType, code: e.target.value})} className="w-full p-1.5 rounded border"/></td><td className="p-2"><input type="text" placeholder="Tên (vd: Mài 2 cạnh dài)" value={newGrindingType.name || ''} onChange={e => setNewGrindingType({...newGrindingType, name: e.target.value})} className="w-full p-1.5 rounded border"/></td><td className="p-2"><input type="number" placeholder="Đơn giá" value={newGrindingType.pricePerMeter || ''} onChange={e => setNewGrindingType({...newGrindingType, pricePerMeter: Number(e.target.value)})} className="w-full p-1.5 rounded border text-right"/></td><td className="p-2 text-center"><button onClick={handleAddGrindingType} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Plus size={20}/></button></td></tr></tfoot></table></div>
                    <TradeGroupManager title="Thuộc tính Kính (Shortcuts)" groups={settings.productAttributes || []} inputValue={newAttr} onInputChange={setNewAttr} onAdd={() => addAttr('product')} onRemove={(group) => removeAttr(group, 'product')} type="product" />
                    <div className="grid grid-cols-1 gap-8"><TradeGroupManager title="Nhóm nghề Khách hàng" groups={settings.customerTradeGroups || []} inputValue={newCustGroup} onInputChange={setNewCustGroup} onAdd={() => addAttr('customer')} onRemove={(group) => removeAttr(group, 'customer')} type="customer" /><TradeGroupManager title="Nhóm nghề Đơn vị Gia công" groups={settings.processingUnitTradeGroups || []} inputValue={newProcGroup} onInputChange={setNewProcGroup} onAdd={() => addAttr('processing')} onRemove={(group) => removeAttr(group, 'processing')} type="processing" /></div>
                </div>
            </div>
            <div className="mt-8 flex justify-center"><button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold shadow-lg hover:bg-blue-700 transition flex items-center"><Save size={24} className="mr-2"/> {saving ? 'Đang lưu...' : 'Lưu Tất Cả Cài Đặt'}</button></div>
        </div>
    );
};