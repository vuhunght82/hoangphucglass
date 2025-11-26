import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Customer, ProductItem, PriceRule } from '../types';
import { useToast } from './Toast';
import { Tag, Plus, Save, Edit, Trash2, Check, X } from 'lucide-react';

const DEFAULT_PRICE_LIST_KEY = 'default_guest';
const DEFAULT_PRICE_LIST_NAME = 'Giá khách lẻ (Mặc định)';

export const PriceListManager: React.FC = () => {
    const { showToast } = useToast();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<ProductItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(DEFAULT_PRICE_LIST_KEY);
    const [priceRules, setPriceRules] = useState<PriceRule[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [newRule, setNewRule] = useState<Partial<PriceRule>>({});
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
    const [editingRuleData, setEditingRuleData] = useState<Partial<PriceRule>>({});

    useEffect(() => {
        const loadBaseData = async () => {
            const [customersData, productsData] = await Promise.all([db.getCustomers(), db.getProducts()]);
            setCustomers(customersData);
            setProducts(productsData);
        };
        loadBaseData();
    }, []);

    useEffect(() => {
        loadPriceRules();
    }, [selectedCustomerId]);

    const loadPriceRules = async () => {
        setIsLoading(true);
        const rules = await db.getPriceRulesForCustomer(selectedCustomerId);
        setPriceRules(rules);
        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await db.savePriceRulesForCustomer(selectedCustomerId, priceRules);
            showToast('Lưu bảng giá thành công!', 'success');
        } catch (error: any) {
            showToast(error.message || 'Lỗi khi lưu bảng giá', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddRule = () => {
        if (!newRule.productCode) {
            showToast('Vui lòng chọn một sản phẩm', 'error');
            return;
        }
        if (priceRules.some(r => r.productCode === newRule.productCode)) {
            showToast('Sản phẩm này đã có trong bảng giá', 'error');
            return;
        }
        const selectedProduct = products.find(p => p.code === newRule.productCode);
        if (!selectedProduct) return;

        const ruleToAdd: PriceRule = {
            id: newRule.productCode,
            productCode: newRule.productCode,
            productName: selectedProduct.name,
            glassPrice: newRule.glassPrice || 0,
            temperedGlassPrice: newRule.temperedGlassPrice || 0,
            grindingPrice: newRule.grindingPrice || 0,
            drillPrice: newRule.drillPrice || 0,
            cutoutPrice: newRule.cutoutPrice || 0,
        };
        setPriceRules([...priceRules, ruleToAdd]);
        setNewRule({});
    };

    const handleDeleteRule = (productCode: string) => {
        setPriceRules(priceRules.filter(r => r.productCode !== productCode));
    };

    const handleStartEdit = (rule: PriceRule) => {
        setEditingRuleId(rule.id);
        setEditingRuleData(rule);
    };

    const handleCancelEdit = () => {
        setEditingRuleId(null);
        setEditingRuleData({});
    };

    const handleSaveEdit = () => {
        if (!editingRuleId) return;
        setPriceRules(priceRules.map(r => r.id === editingRuleId ? { ...r, ...editingRuleData } as PriceRule : r));
        handleCancelEdit();
    };

    const availableProducts = products.filter(p => !priceRules.some(r => r.productCode === p.code));
    const selectedCustomerName = selectedCustomerId === DEFAULT_PRICE_LIST_KEY
        ? DEFAULT_PRICE_LIST_NAME
        : customers.find(c => c.firebaseKey === selectedCustomerId)?.name || '...';

    return (
        <div className="px-6 pt-4 pb-6 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-blue-800 flex items-center"><Tag size={20} className="mr-2"/> Bảng Giá: <span className="text-green-700 ml-2">{selectedCustomerName}</span></h2>
                    <select
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="p-2 border rounded-lg bg-slate-50 min-w-[250px]"
                    >
                        <option value={DEFAULT_PRICE_LIST_KEY}>{DEFAULT_PRICE_LIST_NAME}</option>
                        {customers.map(c => (
                            <option key={c.firebaseKey} value={c.firebaseKey}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-blue-50 text-blue-800">
                        <tr>
                            <th className="p-3 text-left">Tên Hàng Hóa</th>
                            <th className="p-3 text-right">Giá Kính (x1000)</th>
                            <th className="p-3 text-right">Giá C.Lực (x1000)</th>
                            <th className="p-3 text-right">Giá Mài (x1000)</th>
                            <th className="p-3 text-right">Giá Khoan (x1000)</th>
                            <th className="p-3 text-right">Giá Khoét (x1000)</th>
                            <th className="p-3 text-center">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {priceRules.map(rule => (
                            <tr key={rule.id} className="border-t hover:bg-slate-50">
                                {editingRuleId === rule.id ? (
                                    <>
                                        <td className="p-2 font-bold">{editingRuleData.productName}</td>
                                        <td className="p-2"><input type="number" value={editingRuleData.glassPrice! / 1000} onChange={e => setEditingRuleData({...editingRuleData, glassPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                                        <td className="p-2"><input type="number" value={(editingRuleData.temperedGlassPrice || 0) / 1000} onChange={e => setEditingRuleData({...editingRuleData, temperedGlassPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                                        <td className="p-2"><input type="number" value={editingRuleData.grindingPrice! / 1000} onChange={e => setEditingRuleData({...editingRuleData, grindingPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                                        <td className="p-2"><input type="number" value={editingRuleData.drillPrice! / 1000} onChange={e => setEditingRuleData({...editingRuleData, drillPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                                        <td className="p-2"><input type="number" value={editingRuleData.cutoutPrice! / 1000} onChange={e => setEditingRuleData({...editingRuleData, cutoutPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                                        <td className="p-2 text-center flex gap-1">
                                            <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-100 rounded"><Check size={18} /></button>
                                            <button onClick={handleCancelEdit} className="p-2 text-slate-500 hover:bg-slate-100 rounded"><X size={18} /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-3 font-bold">{rule.productName}</td>
                                        <td className="p-3 text-right">{(rule.glassPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right text-orange-600 font-semibold">{(rule.temperedGlassPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right">{(rule.grindingPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right">{(rule.drillPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-right">{(rule.cutoutPrice || 0).toLocaleString()}</td>
                                        <td className="p-3 text-center flex gap-1 justify-center">
                                            <button onClick={() => handleStartEdit(rule)} className="p-2 text-blue-600 hover:bg-blue-100 rounded"><Edit size={16} /></button>
                                            <button onClick={() => handleDeleteRule(rule.productCode)} className="p-2 text-red-600 hover:bg-red-100 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                        <tr className="border-t-2">
                            <td className="p-2">
                                <select value={newRule.productCode || ''} onChange={e => setNewRule({...newRule, productCode: e.target.value})} className="w-full p-1.5 border rounded">
                                    <option value="">-- Chọn sản phẩm --</option>
                                    {availableProducts.map(p => <option key={p.id} value={p.code}>{p.name} ({p.code})</option>)}
                                </select>
                            </td>
                            <td className="p-2"><input type="number" placeholder="Giá Kính..." value={newRule.glassPrice ? newRule.glassPrice / 1000 : ''} onChange={e => setNewRule({...newRule, glassPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                            <td className="p-2"><input type="number" placeholder="Giá C.Lực..." value={newRule.temperedGlassPrice ? newRule.temperedGlassPrice / 1000 : ''} onChange={e => setNewRule({...newRule, temperedGlassPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                            <td className="p-2"><input type="number" placeholder="Giá Mài..." value={newRule.grindingPrice ? newRule.grindingPrice / 1000 : ''} onChange={e => setNewRule({...newRule, grindingPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                            <td className="p-2"><input type="number" placeholder="Giá Khoan..." value={newRule.drillPrice ? newRule.drillPrice / 1000 : ''} onChange={e => setNewRule({...newRule, drillPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                            <td className="p-2"><input type="number" placeholder="Giá Khoét..." value={newRule.cutoutPrice ? newRule.cutoutPrice / 1000 : ''} onChange={e => setNewRule({...newRule, cutoutPrice: Number(e.target.value) * 1000})} className="w-full p-1.5 border rounded text-right"/></td>
                            <td className="p-2 text-center">
                                <button onClick={handleAddRule} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"><Plus size={20}/></button>
                            </td>
                        </tr>
                    </tfoot>
                </table>
                {isLoading && <div className="p-4 text-center">Đang tải dữ liệu...</div>}
                {priceRules.length === 0 && !isLoading && <div className="p-8 text-center text-slate-400">Chưa có giá niêm yết nào cho khách hàng này.</div>}
            </div>
            <div className="flex justify-end">
                <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 bg-green-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-green-700 shadow-lg">
                    <Save size={20} />
                    {isSaving ? 'Đang lưu...' : 'Lưu Bảng Giá'}
                </button>
            </div>
        </div>
    );
};