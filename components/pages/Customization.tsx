import React, { useState, useEffect } from 'react';
import { UnitType, UnitStatus, ExpenseCategory } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';

interface EditableListItem {
  id: string;
  name: string;
  isSystem?: boolean;
}

const CustomizationSection: React.FC<{
    title: string;
    items: EditableListItem[];
    storageKey: string;
    onUpdate: (items: any[]) => void;
}> = ({ title, items, storageKey, onUpdate }) => {
    const { addToast } = useToast();
    const [localItems, setLocalItems] = useState(items);
    const [newItemName, setNewItemName] = useState('');

    const handleAddItem = () => {
        if (!newItemName.trim()) {
            addToast('الاسم لا يمكن أن يكون فارغًا.', 'error');
            return;
        }
        const newItem = { id: `${storageKey}_${Date.now()}`, name: newItemName };
        const updatedItems = [...localItems, newItem];
        setLocalItems(updatedItems);
        localStorage.setItem(storageKey, JSON.stringify(updatedItems));
        onUpdate(updatedItems);
        setNewItemName('');
        logActivity(`Add ${storageKey}`, `Added new item: ${newItemName}`);
        addToast('تمت الإضافة بنجاح', 'success');
    };

    const handleDeleteItem = (itemId: string) => {
        const updatedItems = localItems.filter(item => item.id !== itemId);
        setLocalItems(updatedItems);
        localStorage.setItem(storageKey, JSON.stringify(updatedItems));
        onUpdate(updatedItems);
        logActivity(`Delete ${storageKey}`, `Deleted item ID: ${itemId}`);
        addToast('تم الحذف بنجاح', 'success');
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
            <ul className="space-y-2 mb-4">
                {localItems.map(item => (
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
    const [currency, setCurrency] = useState(() => localStorage.getItem('systemCurrency') || 'IQD');
    const [decimalPlaces, setDecimalPlaces] = useState(() => {
        const saved = localStorage.getItem('systemDecimalPlaces');
        return saved ? parseInt(saved, 10) : 2;
    });

    const currencies = [
        { code: 'IQD', name: 'دينار عراقي' },
        { code: 'USD', name: 'دولار أمريكي' },
        { code: 'EUR', name: 'يورو' },
        { code: 'AED', name: 'درهم إماراتي' },
        { code: 'SAR', name: 'ريال سعودي' },
        { code: 'EGP', name: 'جنيه مصري' },
    ];

    useEffect(() => {
        setUnitTypes(JSON.parse(localStorage.getItem('unitTypes') || '[]'));
        setUnitStatuses(JSON.parse(localStorage.getItem('unitStatuses') || '[]'));
        setExpenseCategories(JSON.parse(localStorage.getItem('expenseCategories') || '[]'));
    }, []);

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        setCurrency(newCurrency);
        localStorage.setItem('systemCurrency', newCurrency);
        logActivity('Update Currency', `Set system currency to ${newCurrency}`);
        addToast('تم تحديث العملة. ستظهر التغييرات عند تنقلك في التطبيق.', 'success');
    };
    
    const handleDecimalPlacesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDecimalPlaces = parseInt(e.target.value, 10);
        setDecimalPlaces(newDecimalPlaces);
        localStorage.setItem('systemDecimalPlaces', newDecimalPlaces.toString());
        logActivity('Update Decimal Places', `Set system decimal places to ${newDecimalPlaces}`);
        addToast('تم تحديث عدد الخانات العشرية. ستظهر التغييرات عند تنقلك في التطبيق.', 'success');
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                </div>
            </div>
        </div>
    );
};

export default Customization;