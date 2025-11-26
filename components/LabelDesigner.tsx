import React, { useState, useRef, useEffect } from 'react';
import { LabelDesign, LabelElement } from '../types';
import { Type, Minus, Trash2, RotateCcw, AlignLeft, AlignCenter, AlignRight, Bold, Italic, ChevronDown, Check } from 'lucide-react';

interface Props {
  design: LabelDesign;
  onChange: (newDesign: LabelDesign) => void;
}

const DraggableResizableDiv: React.FC<{
    element: LabelElement;
    scale: number;
    onUpdate: (element: LabelElement) => void;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ element, scale, onUpdate, isSelected, onSelect }) => {
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();

        const startPos = { x: e.clientX, y: e.clientY };
        const elementStartPos = { x: element.x, y: element.y };
        let hasMoved = false;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startPos.x;
            const dy = moveEvent.clientY - startPos.y;

            if (!hasMoved && Math.sqrt(dx * dx + dy * dy) > 3) { // Drag threshold
                hasMoved = true;
            }

            if (hasMoved) {
                if (moveEvent.preventDefault) moveEvent.preventDefault();
                onUpdate({
                    ...element,
                    x: elementStartPos.x + dx / scale,
                    y: elementStartPos.y + dy / scale,
                });
            }
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };
    
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${element.x * scale}px`,
        top: `${element.y * scale}px`,
        cursor: 'move',
        boxSizing: 'border-box',
        border: isSelected ? '1px dashed #2563eb' : '1px dashed transparent',
        padding: '2px',
        marginLeft: '-2px',
        marginTop: '-2px',
    };
    
    let transformOrigin = 'top left';
    if (element.type === 'text') {
        style.textAlign = element.textAlign || 'left';
        if (element.textAlign === 'center') {
            transformOrigin = 'top center';
        } else if (element.textAlign === 'right') {
            transformOrigin = 'top right';
        }
    }
    style.transformOrigin = transformOrigin;

    if (element.rotation) {
        style.transform = `rotate(${element.rotation}deg)`;
    }

    if (element.type === 'text') {
        const content = element.customText || `[${element.contentKey}]`;
        style.fontSize = `${(element.fontSize || 10) * scale * 0.35}px`;
        style.fontWeight = element.fontWeight || 'normal';
        style.fontStyle = element.fontStyle || 'normal';
        style.width = `${(element.width || 50) * scale}px`;
        style.wordBreak = 'break-word';

        // Special styling for the circled number
        if (element.contentKey === 'pageNumber') {
            style.width = `${5 * scale}px`; // Fixed width
            style.height = `${5 * scale}px`; // Fixed height
            style.display = 'flex';
            style.alignItems = 'center';
            style.justifyContent = 'center';
            style.border = `${isSelected ? '1px dashed #2563eb' : '1px solid black'}`; // Use solid border when not selected
            style.borderRadius = '50%';
            style.lineHeight = 1;
            style.padding = 0; // override padding
        }

        return (
            <div ref={ref} onMouseDown={handleMouseDown} style={style}>
                {content}
            </div>
        );
    } else if (element.type === 'line') {
        style.width = `${(element.width || 50) * scale}px`;
        style.height = `${(element.height || 0.5) * scale}px`;
        style.backgroundColor = element.backgroundColor || '#000';
         return (
            <div ref={ref} onMouseDown={handleMouseDown} style={style}></div>
        );
    }
    return null;
};

const ALL_VARIABLES = [
    { key: 'customerName', name: 'Tên khách hàng' },
    { key: 'productDescription', name: 'Tên hàng hóa' },
    { key: 'dimensions', name: 'Kích thước' },
    { key: 'pageNumber', name: 'Số thứ tự (tròn)' },
    { key: 'itemIndex', name: 'Số tấm (1/n)' },
    { key: 'grindingType', name: 'Kiểu mài' },
    { key: 'dateTime', name: 'Ngày giờ' },
    { key: 'companyInfo', name: 'Thông tin công ty' },
    { key: 'invoiceId', name: 'Mã hóa đơn' },
];

export const LabelDesigner: React.FC<Props> = ({ design, onChange }) => {
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(4);
    const [isVarMenuOpen, setIsVarMenuOpen] = useState(false);
    const varMenuRef = useRef<HTMLDivElement>(null);
    const [customTextInput, setCustomTextInput] = useState('');

    useEffect(() => {
        if (canvasRef.current) {
            const canvasWidth = canvasRef.current.offsetWidth;
            if (design.width > 0) {
                setScale(canvasWidth / design.width);
            }
        }
    }, [design.width]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (varMenuRef.current && !varMenuRef.current.contains(event.target as Node)) {
                setIsVarMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [varMenuRef]);
    
    useEffect(() => {
        const selectedEl = design.elements.find(el => el.id === selectedElementId);
        if (selectedEl && selectedEl.type === 'text' && selectedEl.contentKey === 'custom') {
            setCustomTextInput(selectedEl.customText || '');
        }
    }, [selectedElementId, design.elements]);

    const handleAddElement = (type: 'text' | 'line' | 'variable', contentKey?: string) => {
        let newElement: LabelElement;

        if (type === 'variable' && contentKey) {
            newElement = {
                id: `${contentKey}_${Date.now()}`,
                type: 'text',
                contentKey: contentKey,
                x: 5, y: 5, fontSize: 8, fontWeight: 'normal',
                fontStyle: 'normal', textAlign: 'left', rotation: 0,
                width: 40,
                isDeletable: true,
            };
        } else if (type === 'text') {
            newElement = {
                id: `custom_${Date.now()}`,
                type: 'text',
                contentKey: 'custom',
                customText: 'Nội dung mới',
                x: 5, y: 5, fontSize: 8, fontWeight: 'normal',
                fontStyle: 'normal', textAlign: 'left', rotation: 0,
                width: 30,
                isDeletable: true,
            };
        } else { // line
            newElement = {
                id: `line_${Date.now()}`,
                type: 'line',
                x: 5, y: 15, width: design.width - 10, height: 0.3,
                backgroundColor: '#000000', rotation: 0,
                isDeletable: true,
            };
        }

        onChange({ ...design, elements: [...design.elements, newElement] });
        setSelectedElementId(newElement.id);
    };

    const handleUpdateElement = (updatedElement: LabelElement) => {
        onChange({
            ...design,
            elements: design.elements.map(el => (el.id === updatedElement.id ? updatedElement : el))
        });
    };
    
    const handleRemoveElement = () => {
        if (!selectedElementId) return;
        onChange({ ...design, elements: design.elements.filter(el => el.id !== selectedElementId) });
        setSelectedElementId(null);
    };

    const selectedElement = design.elements.find(el => el.id === selectedElementId);
    const availableVariables = ALL_VARIABLES.filter(v => !design.elements.some(el => el.contentKey === v.key));

    const PropInput: React.FC<{label: string, value: any, onChange: (val: any) => void, type?: string, step?: number, suffix?: string}> =
    ({label, value, onChange, type="number", step=0.1, suffix="mm"}) => (
        <div>
            <label className="text-xs font-semibold text-slate-500">{label}</label>
            <div className="relative">
                <input
                    type={type}
                    step={step}
                    value={value}
                    onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                    className="w-full bg-slate-100 p-1.5 rounded border border-slate-200 text-sm mt-1 pr-8"
                />
                {suffix && <span className="absolute right-2 top-2.5 text-xs text-slate-400">{suffix}</span>}
            </div>
        </div>
    );
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-4">
            <div>
                {/* Canvas Area */}
                <div className="flex gap-2 mb-4">
                    <button onClick={() => handleAddElement('text')} className="flex items-center gap-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg"><Type size={16}/> Thêm Chữ</button>
                    <button onClick={() => handleAddElement('line')} className="flex items-center gap-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg"><Minus size={16}/> Thêm Đường Kẻ</button>
                    <div className="relative" ref={varMenuRef}>
                        <button onClick={() => setIsVarMenuOpen(!isVarMenuOpen)} className="flex items-center gap-2 text-sm font-bold bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg">
                            Thêm Biến <ChevronDown size={16}/>
                        </button>
                        {isVarMenuOpen && availableVariables.length > 0 && (
                            <div className="absolute top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                                {availableVariables.map(v => (
                                    <button key={v.key} onClick={() => { handleAddElement('variable', v.key); setIsVarMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100">{v.name}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div ref={canvasRef} className="bg-gray-200 p-4">
                    <div
                        style={{
                            width: `${design.width * scale}px`,
                            height: `${design.height * scale}px`,
                            borderRadius: `${design.borderRadius * scale}px`,
                        }}
                        className="bg-white shadow-lg relative border border-slate-800 box-border"
                        onMouseDown={() => setSelectedElementId(null)}
                    >
                      {design.elements.map(el => (
                          <DraggableResizableDiv
                              key={el.id}
                              element={el}
                              scale={scale}
                              onUpdate={handleUpdateElement}
                              isSelected={el.id === selectedElementId}
                              onSelect={() => setSelectedElementId(el.id)}
                          />
                      ))}
                    </div>
                </div>
            </div>

            {/* Properties Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                <h4 className="font-bold text-center border-b pb-2">Thuộc tính</h4>
                
                {selectedElement ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                           <PropInput label="Vị trí X" value={selectedElement.x.toFixed(1)} onChange={(v:number) => handleUpdateElement({...selectedElement, x: v})} />
                           <PropInput label="Vị trí Y" value={selectedElement.y.toFixed(1)} onChange={(v:number) => handleUpdateElement({...selectedElement, y: v})} />
                        </div>
                         <PropInput label="Góc xoay" value={selectedElement.rotation || 0} onChange={(v:number) => handleUpdateElement({...selectedElement, rotation: v})} suffix="°" />

                        {selectedElement.type === 'text' && (
                          <>
                           {selectedElement.contentKey === 'custom' && (
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Nội dung</label>
                                    <div className="flex items-center gap-1 mt-1">
                                        <input
                                            type="text"
                                            value={customTextInput}
                                            onChange={e => setCustomTextInput(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleUpdateElement({ ...selectedElement, customText: customTextInput });
                                                }
                                            }}
                                            className="w-full bg-slate-100 p-1.5 rounded border border-slate-200 text-sm"
                                        />
                                        <button 
                                            onClick={() => handleUpdateElement({ ...selectedElement, customText: customTextInput })}
                                            className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"
                                            title="Áp dụng thay đổi"
                                        >
                                            <Check size={16} />
                                        </button>
                                    </div>
                                </div>
                           )}
                           <div className="grid grid-cols-2 gap-2">
                             <PropInput label="Cỡ chữ" value={selectedElement.fontSize || 10} onChange={(v:number) => handleUpdateElement({...selectedElement, fontSize: v})} suffix="pt"/>
                             {selectedElement.contentKey !== 'pageNumber' && (
                                <PropInput label="Chiều Rộng" value={selectedElement.width || 50} onChange={(v:number) => handleUpdateElement({...selectedElement, width: v})} suffix="mm"/>
                             )}
                           </div>
                           <div>
                               <label className="text-xs font-semibold text-slate-500">Kiểu chữ & Căn lề</label>
                               <div className="flex gap-1 mt-1">
                                   <button onClick={() => handleUpdateElement({...selectedElement, fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold'})} className={`p-2 rounded flex-1 ${selectedElement.fontWeight === 'bold' ? 'bg-blue-200' : 'bg-slate-100'}`}><Bold size={16}/></button>
                                   <button onClick={() => handleUpdateElement({...selectedElement, fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic'})} className={`p-2 rounded flex-1 ${selectedElement.fontStyle === 'italic' ? 'bg-blue-200' : 'bg-slate-100'}`}><Italic size={16}/></button>
                                   <button onClick={() => handleUpdateElement({...selectedElement, textAlign: 'left'})} className={`p-2 rounded flex-1 ${selectedElement.textAlign === 'left' ? 'bg-blue-200' : 'bg-slate-100'}`}><AlignLeft size={16}/></button>
                                   <button onClick={() => handleUpdateElement({...selectedElement, textAlign: 'center'})} className={`p-2 rounded flex-1 ${selectedElement.textAlign === 'center' ? 'bg-blue-200' : 'bg-slate-100'}`}><AlignCenter size={16}/></button>
                                   <button onClick={() => handleUpdateElement({...selectedElement, textAlign: 'right'})} className={`p-2 rounded flex-1 ${selectedElement.textAlign === 'right' ? 'bg-blue-200' : 'bg-slate-100'}`}><AlignRight size={16}/></button>
                               </div>
                           </div>
                          </>
                        )}
                        {selectedElement.type === 'line' && (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                                <PropInput label="Rộng" value={selectedElement.width || 50} onChange={(v:number) => handleUpdateElement({...selectedElement, width: v})} />
                                <PropInput label="Dày" value={selectedElement.height || 0.5} onChange={(v:number) => handleUpdateElement({...selectedElement, height: v})} />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-500">Màu sắc</label>
                                <input type="color" value={selectedElement.backgroundColor || '#000000'} onChange={e => handleUpdateElement({...selectedElement, backgroundColor: e.target.value})} className="w-full h-8 p-1 mt-1 border rounded" />
                            </div>
                          </>
                        )}

                        <button 
                            onClick={handleRemoveElement}
                            disabled={!selectedElement.isDeletable}
                            className="w-full mt-4 flex items-center justify-center gap-2 bg-red-100 text-red-700 font-bold py-2 rounded-lg hover:bg-red-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed">
                            <Trash2 size={16}/> Xóa
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                         <h4 className="font-bold text-sm">Cài đặt chung</h4>
                         <div className="grid grid-cols-2 gap-2">
                             <PropInput label="Rộng (Tem)" value={design.width} onChange={(v:number) => onChange({...design, width: v})} />
                             <PropInput label="Cao (Tem)" value={design.height} onChange={(v:number) => onChange({...design, height: v})} />
                         </div>
                         <PropInput label="Bo góc" value={design.borderRadius} onChange={(v:number) => onChange({...design, borderRadius: v})} />
                         <p className="text-xs text-slate-500 text-center pt-4">Chọn một đối tượng trên tem để chỉnh sửa.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
