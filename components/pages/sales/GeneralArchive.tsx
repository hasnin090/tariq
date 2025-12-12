import React, { useState, useEffect } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { ArchiveIcon, TrashIcon, EyeIcon, ArrowUpIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';

interface ArchivedItem {
    id: string;
    type: 'expense' | 'payment' | 'transaction' | 'sale';
    date: string;
    description: string;
    amount: number;
    archivedAt: string;
    archivedBy: string;
    details: any;
}

const GeneralArchive: React.FC = () => {
    const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ArchivedItem | null>(null);
    const [itemToRestore, setItemToRestore] = useState<ArchivedItem | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'expense' | 'payment' | 'transaction' | 'sale'>('all');
    const { addToast } = useToast();
    const { currentUser } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        try {
            setLoading(true);
            const archived = JSON.parse(localStorage.getItem('archivedItems') || '[]');
            setArchivedItems(archived);
        } catch (error) {
            console.error('Error loading archived items:', error);
            addToast('خطأ في تحميل البيانات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = (item: ArchivedItem) => {
        setSelectedItem(item);
        setShowDetailsModal(true);
    };

    const handleDeleteClick = (item: ArchivedItem) => {
        if (currentUser?.role !== 'Admin') {
            addToast('هذه العملية متاحة للمدير فقط', 'error');
            return;
        }
        setItemToDelete(item);
        setShowDeleteConfirm(true);
    };

    const handleRestoreClick = (item: ArchivedItem) => {
        setItemToRestore(item);
        setShowRestoreConfirm(true);
    };

    const handleConfirmDelete = () => {
        if (!itemToDelete) return;

        try {
            const updatedItems = archivedItems.filter(item => item.id !== itemToDelete.id);
            localStorage.setItem('archivedItems', JSON.stringify(updatedItems));
            
            logActivity('Delete Archived Item', `Permanently deleted ${getTypeLabel(itemToDelete.type)}: ${itemToDelete.description}`);
            addToast('تم حذف العنصر نهائياً من الأرشيف', 'success');
            
            setShowDeleteConfirm(false);
            setItemToDelete(null);
            loadData();
        } catch (error) {
            console.error('Error deleting item:', error);
            addToast('خطأ في حذف العنصر.', 'error');
        }
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;

        try {
            // Remove from archive
            const updatedItems = archivedItems.filter(item => item.id !== itemToRestore.id);
            localStorage.setItem('archivedItems', JSON.stringify(updatedItems));

            // Restore to original location based on type
            const storageKey = getStorageKeyForType(itemToRestore.type);
            if (storageKey) {
                const originalData = JSON.parse(localStorage.getItem(storageKey) || '[]');
                originalData.push(itemToRestore.details);
                localStorage.setItem(storageKey, JSON.stringify(originalData));
            }

            logActivity('Restore Archived Item', `Restored ${getTypeLabel(itemToRestore.type)}: ${itemToRestore.description}`);
            addToast('تم استرجاع العنصر بنجاح', 'success');
            
            setShowRestoreConfirm(false);
            setItemToRestore(null);
            loadData();
        } catch (error) {
            console.error('Error restoring item:', error);
            addToast('خطأ في استرجاع العنصر.', 'error');
        }
    };

    const getTypeLabel = (type: string): string => {
        const labels: Record<string, string> = {
            expense: 'مصروف',
            payment: 'دفعة',
            transaction: 'معاملة',
            sale: 'عملية بيع',
        };
        return labels[type] || type;
    };

    const getStorageKeyForType = (type: string): string | null => {
        const keys: Record<string, string> = {
            expense: 'expenses',
            payment: 'payments',
            transaction: 'transactions',
            sale: 'unitSales',
        };
        return keys[type] || null;
    };

    const getTypeBadgeColor = (type: string): string => {
        const colors: Record<string, string> = {
            expense: 'bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200',
            payment: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
            transaction: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
            sale: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
        };
        return colors[type] || 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200';
    };

    const filteredItems = filterType === 'all' 
        ? archivedItems 
        : archivedItems.filter(item => item.type === filterType);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <ArchiveIcon className="h-8 w-8 text-slate-600 dark:text-slate-300" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الأرشيف العام</h2>
            </div>

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterType === 'all'
                            ? 'bg-primary-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    الكل ({archivedItems.length})
                </button>
                <button
                    onClick={() => setFilterType('expense')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterType === 'expense'
                            ? 'bg-rose-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    مصروفات ({archivedItems.filter(i => i.type === 'expense').length})
                </button>
                <button
                    onClick={() => setFilterType('payment')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterType === 'payment'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    دفعات ({archivedItems.filter(i => i.type === 'payment').length})
                </button>
                <button
                    onClick={() => setFilterType('transaction')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterType === 'transaction'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    معاملات ({archivedItems.filter(i => i.type === 'transaction').length})
                </button>
                <button
                    onClick={() => setFilterType('sale')}
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        filterType === 'sale'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                >
                    مبيعات ({archivedItems.filter(i => i.type === 'sale').length})
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                {filteredItems.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="border-b-2 border-white/20 bg-white/5">
                                    <th className="p-4 font-bold text-sm text-slate-200">التاريخ</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">النوع</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">الوصف</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">المبلغ</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">تاريخ الأرشفة</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">أرشفه</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(item => (
                                    <tr key={item.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.date}</td>
                                        <td className="p-4">
                                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getTypeBadgeColor(item.type)}`}>
                                                {getTypeLabel(item.type)}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{item.description}</td>
                                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(item.amount)}</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">{item.archivedAt}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 text-sm">{item.archivedBy}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleShowDetails(item)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="عرض التفاصيل"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleRestoreClick(item)}
                                                    className="text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
                                                    title="استرجاع"
                                                >
                                                    <ArrowUpIcon className="h-5 w-5" />
                                                </button>
                                                {currentUser?.role === 'Admin' && (
                                                    <button
                                                        onClick={() => handleDeleteClick(item)}
                                                        className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
                                                        title="حذف نهائياً"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <ArchiveIcon className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                        <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">
                            {filterType === 'all' ? 'لا توجد عناصر مؤرشفة' : `لا توجد ${getTypeLabel(filterType)} مؤرشفة`}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">الأرشيف فارغ حالياً.</p>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedItem && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">تفاصيل العنصر المؤرشف</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">النوع</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getTypeBadgeColor(selectedItem.type)}`}>
                                        {getTypeLabel(selectedItem.type)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">التاريخ</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedItem.date}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">الوصف</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedItem.description}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">المبلغ</p>
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedItem.amount)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">تاريخ الأرشفة</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedItem.archivedAt}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">أرشفه</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedItem.archivedBy}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    handleRestoreClick(selectedItem);
                                }}
                                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700"
                            >
                                استرجاع
                            </button>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && itemToDelete && (
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleConfirmDelete}
                    title="تأكيد الحذف النهائي"
                    message={`هل أنت متأكد من حذف ${getTypeLabel(itemToDelete.type)}: "${itemToDelete.description}" نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`}
                    confirmText="حذف نهائياً"
                    cancelText="إلغاء"
                    type="danger"
                />
            )}

            {/* Restore Confirmation Modal */}
            {showRestoreConfirm && itemToRestore && (
                <ConfirmModal
                    isOpen={showRestoreConfirm}
                    onClose={() => setShowRestoreConfirm(false)}
                    onConfirm={handleConfirmRestore}
                    title="تأكيد الاسترجاع"
                    message={`هل أنت متأكد من استرجاع ${getTypeLabel(itemToRestore.type)}: "${itemToRestore.description}"؟`}
                    confirmText="استرجاع"
                    cancelText="إلغاء"
                    type="success"
                />
            )}
        </div>
    );
};

export default GeneralArchive;
