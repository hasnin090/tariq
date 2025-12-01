import React, { useState, useEffect } from 'react';
import { UnitType, UnitStatus, ExpenseCategory } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { unitTypesService, unitStatusesService, expenseCategoriesService, settingsService } from '../../src/services/supabaseService';
import { refreshCurrencyCache } from '../../utils/currencyFormatter';
import { PlusIcon, TrashIcon } from '../shared/Icons';

interface EditableListItem {
  id: string;
  name: string;
  isSystem?: boolean;
}

const CustomizationSection: React.FC<{
    title: string;
    items: EditableListItem[];
    storageKey: 'unitTypes' | 'unitStatuses' | 'expenseCategories';
    onUpdate: (items: any[]) => void;
}> = ({ title, items, storageKey, onUpdate }) => {
    const { addToast } = useToast();
    const [newItemName, setNewItemName] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    const services = {
        unitTypes: unitTypesService,
        unitStatuses: unitStatusesService,
        expenseCategories: expenseCategoriesService,
    };

    const service = services[storageKey];

    const handleAddItem = async () => {
        if (!newItemName.trim()) {
            addToast('الاسم لا يمكن أن يكون فارغًا.', 'error');
            return;
        }
        try {
            const newItem = await service.create({ name: newItemName });
            if (newItem) {
                const updatedItems = [...items, newItem];
                onUpdate(updatedItems);
                setNewItemName('');
                logActivity(`Add ${storageKey}`, `Added new item: ${newItemName}`);
                addToast('تمت الإضافة بنجاح', 'success');
            }
        } catch (error) {
            console.error(`Error adding item to ${storageKey}:`, error);
            addToast('حدث خطأ أثناء الإضافة.', 'error');
        }
    };

    const handleDeleteItem = async (itemId: string, itemName: string) => {
        try {
            await service.delete(itemId);
            const updatedItems = items.filter(item => item.id !== itemId);
            onUpdate(updatedItems);
            logActivity(`Delete ${storageKey}`, `Deleted item: ${itemName}`);
            addToast('تم الحذف بنجاح', 'success');
        } catch (error) {
            console.error(`Error deleting item from ${storageKey}:`, error);
            addToast('حدث خطأ أثناء الحذف.', 'error');
        }
    };
    
    return (
        <div className="glass-card overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <h3 className="font-bold text-lg text-slate-100">{title}</h3>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">{items.length} عنصر</span>
                    <svg 
                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-white/10">
                    {/* Add New Item */}
                    <div className="p-4 bg-white/5 border-b border-white/10">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newItemName} 
                                onChange={e => setNewItemName(e.target.value)} 
                                onKeyPress={e => e.key === 'Enter' && handleAddItem()}
                                placeholder="إضافة جديد..." 
                                className="flex-grow input-field"
                            />
                            <button 
                                onClick={handleAddItem} 
                                className="btn-primary flex items-center gap-2 px-4"
                            >
                                <PlusIcon className="h-4 w-4" />
                                إضافة
                            </button>
                        </div>
                    </div>

                    {/* Items List with max height and scroll */}
                    <div className="max-h-96 overflow-y-auto">
                        {items.length > 0 ? (
                            <ul className="divide-y divide-white/10">
                                {items.map(item => (
                                    <li key={item.id} className="p-3 flex justify-between items-center hover:bg-white/5 transition-colors">
                                        <span className="font-medium text-slate-200">{item.name}</span>
                                        {!item.isSystem ? (
                                            <button 
                                                onClick={() => handleDeleteItem(item.id, item.name)} 
                                                className="text-rose-400 hover:text-rose-300 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                                                title="حذف"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-1 rounded">نظام</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <p>لا توجد عناصر</p>
                                <p className="text-sm mt-1">أضف أول عنصر للبدء</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Customization: React.FC = () => {
    const { addToast } = useToast();
    const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
    const [unitStatuses, setUnitStatuses] = useState<UnitStatus[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
    const [currency, setCurrency] = useState('IQD');
    const [decimalPlaces, setDecimalPlaces] = useState(2);
    const [accentColor, setAccentColor] = useState('amber');

    const currencies = [
        { code: 'IQD', name: 'دينار عراقي' },
        { code: 'USD', name: 'دولار أمريكي' },
        { code: 'EUR', name: 'يورو' },
        { code: 'AED', name: 'درهم إماراتي' },
        { code: 'SAR', name: 'ريال سعودي' },
        { code: 'EGP', name: 'جنيه مصري' },
    ];

    const colorSchemes = [
        { value: 'amber', name: 'برتقالي', preview: 'from-amber-500 to-amber-600' },
        { value: 'blue', name: 'أزرق', preview: 'from-blue-500 to-blue-600' },
        { value: 'emerald', name: 'أخضر', preview: 'from-emerald-500 to-emerald-600' },
        { value: 'purple', name: 'بنفسجي', preview: 'from-purple-500 to-purple-600' },
        { value: 'rose', name: 'وردي', preview: 'from-rose-500 to-rose-600' },
        { value: 'cyan', name: 'سماوي', preview: 'from-cyan-500 to-cyan-600' },
        { value: 'indigo', name: 'نيلي', preview: 'from-indigo-500 to-indigo-600' },
        { value: 'teal', name: 'تركواز', preview: 'from-teal-500 to-teal-600' },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [
                    unitTypesData, 
                    unitStatusesData, 
                    expenseCategoriesData,
                    currencyData,
                    decimalPlacesData,
                    accentColorData
                ] = await Promise.all([
                    unitTypesService.getAll(),
                    unitStatusesService.getAll(),
                    expenseCategoriesService.getAll(),
                    settingsService.get('systemCurrency'),
                    settingsService.get('systemDecimalPlaces'),
                    settingsService.get('accentColor')
                ]);
                setUnitTypes(unitTypesData as UnitType[]);
                setUnitStatuses(unitStatusesData as UnitStatus[]);
                setExpenseCategories(expenseCategoriesData as ExpenseCategory[]);
                
                // Validate and clean currency data
                let validCurrency = 'IQD';
                if (currencyData && /^[A-Z]{3}$/.test(currencyData)) {
                    validCurrency = currencyData;
                } else if (currencyData && !/^[A-Z]{3}$/.test(currencyData)) {
                    // Invalid currency detected - clean it up
                    console.warn(`Invalid currency code detected: "${currencyData}", resetting to IQD`);
                    await settingsService.set('systemCurrency', 'IQD');
                    localStorage.removeItem('systemCurrency');
                    localStorage.setItem('systemCurrency', 'IQD');
                    addToast('تم تصحيح رمز العملة إلى IQD', 'info');
                } else {
                    // No currency set, use default
                    await settingsService.set('systemCurrency', 'IQD');
                    localStorage.setItem('systemCurrency', 'IQD');
                }
                setCurrency(validCurrency);
                localStorage.setItem('systemCurrency', validCurrency);
                
                if (decimalPlacesData) {
                    const places = parseInt(decimalPlacesData, 10);
                    setDecimalPlaces(places);
                    localStorage.setItem('systemDecimalPlaces', places.toString());
                }
                if (accentColorData) {
                    setAccentColor(accentColorData);
                    document.documentElement.setAttribute('data-accent-color', accentColorData);
                }
                
                // Refresh currency cache
                await refreshCurrencyCache();

            } catch (error) {
                console.error("Failed to fetch customization data:", error);
                addToast("فشل في تحميل بيانات التخصيص.", "error");
            }
        };
        fetchData();
    }, [addToast]);

    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        
        // Validate it's a proper currency code (3 letters)
        if (!newCurrency || newCurrency.length !== 3) {
            addToast('رمز العملة غير صالح', 'error');
            return;
        }
        
        setCurrency(newCurrency);
        try {
            // Clear any old invalid data first
            localStorage.removeItem('systemCurrency');
            
            // Set new valid currency
            await settingsService.set('systemCurrency', newCurrency);
            localStorage.setItem('systemCurrency', newCurrency);
            await refreshCurrencyCache();
            logActivity('Update Currency', `Set system currency to ${newCurrency}`);
            addToast('تم تحديث العملة بنجاح!', 'success');
            
            // Auto refresh after 1 second
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Failed to save currency setting:", error);
            addToast("فشل في حفظ إعداد العملة.", "error");
        }
    };
    
    const handleDecimalPlacesChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDecimalPlaces = parseInt(e.target.value, 10);
        setDecimalPlaces(newDecimalPlaces);
        try {
            // Clear old value first
            localStorage.removeItem('systemDecimalPlaces');
            
            await settingsService.set('systemDecimalPlaces', newDecimalPlaces.toString());
            localStorage.setItem('systemDecimalPlaces', newDecimalPlaces.toString());
            await refreshCurrencyCache();
            logActivity('Update Decimal Places', `Set system decimal places to ${newDecimalPlaces}`);
            addToast('تم تحديث عدد الخانات العشرية بنجاح!', 'success');
            
            // Auto refresh after 1 second
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error("Failed to save decimal places setting:", error);
            addToast("فشل في حفظ إعداد الخانات العشرية.", "error");
        }
    };

    const handleColorChange = async (newColor: string) => {
        console.log('🎨 Changing color to:', newColor);
        setAccentColor(newColor);
        try {
            // Save to database
            await settingsService.set('accentColor', newColor);
            console.log('✅ Color saved to database');
            
            // Save to localStorage as backup
            localStorage.setItem('accentColor', newColor);
            
            // Apply to DOM immediately
            document.documentElement.setAttribute('data-accent-color', newColor);
            console.log('✅ Color applied to DOM:', document.documentElement.getAttribute('data-accent-color'));
            
            logActivity('Update Accent Color', `Set system accent color to ${newColor}`);
            addToast(`تم تحديث نظام الألوان إلى ${newColor} بنجاح!`, 'success');
            
            // Force reload page to apply color changes everywhere
            setTimeout(() => {
                console.log('🔄 Reloading page...');
                window.location.reload();
            }, 800);
        } catch (error) {
            console.error("❌ Failed to save accent color setting:", error);
            addToast("فشل في حفظ إعداد اللون.", "error");
        }
    };

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-100 mb-6">تخصيص النظام</h2>
            
            {/* General Settings */}
            <div className="glass-card p-6 mb-6">
                <h3 className="font-bold text-xl text-slate-100 mb-6 pb-3 border-b border-white/10">الإعدادات العامة</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Currency */}
                    <div>
                        <label htmlFor="currency-select" className="block text-sm font-semibold text-slate-200 mb-2">
                            عملة النظام
                        </label>
                        <p className="text-xs text-slate-400 mb-3">
                            العملة المستخدمة لعرض جميع المبالغ المالية
                        </p>
                        <select
                            id="currency-select"
                            value={currency}
                            onChange={handleCurrencyChange}
                            className="input-field"
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Decimal Places */}
                    <div>
                        <label htmlFor="decimal-places-select" className="block text-sm font-semibold text-slate-200 mb-2">
                            الخانات العشرية
                        </label>
                        <p className="text-xs text-slate-400 mb-3">
                            عدد الأرقام بعد الفاصلة العشرية
                        </p>
                        <select
                            id="decimal-places-select"
                            value={decimalPlaces}
                            onChange={handleDecimalPlacesChange}
                            className="input-field"
                        >
                            <option value="0">بدون خانات عشرية (1,234)</option>
                            <option value="1">خانة واحدة (1,234.5)</option>
                            <option value="2">خانتان (1,234.56)</option>
                            <option value="3">ثلاث خانات (1,234.567)</option>
                        </select>
                    </div>

                    {/* Color Scheme */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-200 mb-2">
                            نظام الألوان
                        </label>
                        <p className="text-xs text-slate-400 mb-3">
                            اللون الأساسي للأزرار والعناصر التفاعلية
                        </p>
                        <div className="grid grid-cols-4 gap-2">
                            {colorSchemes.map(scheme => (
                                <button
                                    key={scheme.value}
                                    onClick={() => handleColorChange(scheme.value)}
                                    className={`group relative p-2 rounded-lg border-2 transition-all ${
                                        accentColor === scheme.value 
                                            ? 'border-white shadow-lg scale-105' 
                                            : 'border-white/20 hover:border-white/40'
                                    }`}
                                    title={scheme.name}
                                >
                                    <div className={`h-8 bg-gradient-to-r ${scheme.preview} rounded`}></div>
                                    {accentColor === scheme.value && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Data Customization Sections */}
            <div className="space-y-4">
                <h3 className="font-bold text-xl text-slate-100 mb-4">تخصيص البيانات</h3>
                <CustomizationSection title="أنواع الوحدات" items={unitTypes} storageKey="unitTypes" onUpdate={setUnitTypes} />
                <CustomizationSection title="حالات الوحدات" items={unitStatuses} storageKey="unitStatuses" onUpdate={setUnitStatuses} />
                <CustomizationSection title="فئات المصروفات" items={expenseCategories} storageKey="expenseCategories" onUpdate={setExpenseCategories} />
            </div>
        </div>
    );
};

export default Customization;
