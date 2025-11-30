import React, { useState, useEffect } from 'react';
import { UnitType, UnitStatus, ExpenseCategory } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { unitTypesService, unitStatusesService, expenseCategoriesService, settingsService } from '../../src/services/supabaseService';

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

    const handleDeleteItem = async (itemId: string) => {
        try {
            await service.delete(itemId);
            const updatedItems = items.filter(item => item.id !== itemId);
            onUpdate(updatedItems);
            logActivity(`Delete ${storageKey}`, `Deleted item ID: ${itemId}`);
            addToast('تم الحذف بنجاح', 'success');
        } catch (error) {
            console.error(`Error deleting item from ${storageKey}:`, error);
            addToast('حدث خطأ أثناء الحذف.', 'error');
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
            <ul className="space-y-2 mb-4">
                {items.map(item => (
                    <li key={item.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 p-3 rounded-lg">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.name}</span>
                        {!item.isSystem ? (
                             <button onClick={() => handleDeleteItem(item.id)} className="text-rose-500 hover:text-rose-700 text-sm font-semibold">حذف</button>
                        ) : (
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">نظام</span>
                        )}
                    </li>
                ))}
            </ul>
            <div className="flex gap-2">
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="إضافة جديد..." className="flex-grow p-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-900" />
                <button onClick={handleAddItem} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700">إضافة</button>
            </div>
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
        { value: 'amber', name: 'برتقالي (افتراضي)', preview: 'bg-gradient-to-r from-amber-500 to-amber-600' },
        { value: 'blue', name: 'أزرق', preview: 'bg-gradient-to-r from-blue-500 to-blue-600' },
        { value: 'emerald', name: 'أخضر زمردي', preview: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
        { value: 'purple', name: 'بنفسجي', preview: 'bg-gradient-to-r from-purple-500 to-purple-600' },
        { value: 'rose', name: 'وردي', preview: 'bg-gradient-to-r from-rose-500 to-rose-600' },
        { value: 'cyan', name: 'سماوي', preview: 'bg-gradient-to-r from-cyan-500 to-cyan-600' },
        { value: 'indigo', name: 'نيلي', preview: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
        { value: 'teal', name: 'أخضر مزرق', preview: 'bg-gradient-to-r from-teal-500 to-teal-600' },
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
                if (currencyData) setCurrency(currencyData);
                if (decimalPlacesData) setDecimalPlaces(parseInt(decimalPlacesData, 10));
                if (accentColorData) {
                    setAccentColor(accentColorData);
                    document.documentElement.setAttribute('data-accent-color', accentColorData);
                }

            } catch (error) {
                console.error("Failed to fetch customization data:", error);
                addToast("فشل في تحميل بيانات التخصيص.", "error");
            }
        };
        fetchData();
    }, [addToast]);

    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        setCurrency(newCurrency);
        try {
            await settingsService.set('systemCurrency', newCurrency);
            logActivity('Update Currency', `Set system currency to ${newCurrency}`);
            addToast('تم تحديث العملة. ستظهر التغييرات عند تنقلك في التطبيق.', 'success');
        } catch (error) {
            console.error("Failed to save currency setting:", error);
            addToast("فشل في حفظ إعداد العملة.", "error");
        }
    };
    
    const handleDecimalPlacesChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDecimalPlaces = parseInt(e.target.value, 10);
        setDecimalPlaces(newDecimalPlaces);
        try {
            await settingsService.set('systemDecimalPlaces', newDecimalPlaces.toString());
            logActivity('Update Decimal Places', `Set system decimal places to ${newDecimalPlaces}`);
            addToast('تم تحديث عدد الخانات العشرية. ستظهر التغييرات عند تنقلك في التطبيق.', 'success');
        } catch (error) {
            console.error("Failed to save decimal places setting:", error);
            addToast("فشل في حفظ إعداد الخانات العشرية.", "error");
        }
    };

    const handleColorChange = async (newColor: string) => {
        setAccentColor(newColor);
        try {
            await settingsService.set('accentColor', newColor);
            document.documentElement.setAttribute('data-accent-color', newColor);
            logActivity('Update Accent Color', `Set system accent color to ${newColor}`);
            addToast('تم تحديث نظام الألوان. سيتم تطبيق الألوان الجديدة فوراً.', 'success');
        } catch (error) {
            console.error("Failed to save accent color setting:", error);
            addToast("فشل في حفظ إعداد اللون.", "error");
        }
    };

    return (
        <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">تخصيص النظام</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CustomizationSection title="أنواع الوحدات" items={unitTypes} storageKey="unitTypes" onUpdate={setUnitTypes} />
                <CustomizationSection title="حالات الوحدات" items={unitStatuses} storageKey="unitStatuses" onUpdate={setUnitStatuses} />
                <CustomizationSection title="فئات المصروفات" items={expenseCategories} storageKey="expenseCategories" onUpdate={setExpenseCategories} />
            </div>

            <div className="mt-8 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">إعدادات عامة</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                        <label htmlFor="currency-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            عملة النظام
                        </label>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            اختر العملة الافتراضية لعرض جميع القيم المالية في التطبيق.
                        </p>
                        <select
                            id="currency-select"
                            value={currency}
                            onChange={handleCurrencyChange}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                        >
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>
                                    {c.name} ({c.code})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                         <label htmlFor="decimal-places-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            الخانات العشرية للمبالغ
                        </label>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            حدد عدد الأرقام التي تظهر بعد الفاصلة العشرية للقيم المالية.
                        </p>
                        <select
                            id="decimal-places-select"
                            value={decimalPlaces}
                            onChange={handleDecimalPlacesChange}
                            className="w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                        >
                            <option value="0">0 (بدون خانات عشرية)</option>
                            <option value="1">1</option>
                            <option value="2">2 (افتراضي)</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            نظام الألوان
                        </label>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                            اختر اللون الأساسي للنظام (الأزرار، الروابط، التحديدات).
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            {colorSchemes.map(scheme => (
                                <button
                                    key={scheme.value}
                                    onClick={() => handleColorChange(scheme.value)}
                                    className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                                        accentColor === scheme.value 
                                            ? 'border-slate-900 dark:border-white shadow-md' 
                                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    <div className={`h-8 w-full ${scheme.preview} rounded mb-2`}></div>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                                        {scheme.name}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Customization;
