import React, { useState, useEffect } from 'react';
import { Unit, UnitType, UnitStatus, Customer } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import { unitsService, customersService, unitTypesService, unitStatusesService, bookingsService } from '../../src/services/supabaseService';
import ConfirmModal from '../shared/ConfirmModal';
import { CloseIcon, BuildingIcon, EditIcon, TrashIcon, UnitsEmptyIcon } from '../shared/Icons';
import EmptyState from '../shared/EmptyState';

const Units: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const [units, setUnits] = useState<Unit[]>([]);
    const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
    const [unitStatuses, setUnitStatuses] = useState<UnitStatus[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);

    const canEdit = currentUser?.role === 'Admin';
    const canDelete = currentUser?.role === 'Admin';

    useEffect(() => {
        loadData();
        
        const unitsSubscription = unitsService.subscribe((data) => {
            setUnits(data);
        });

        const customersSubscription = customersService.subscribe((data) => {
            setCustomers(data);
        });

        return () => {
            unitsSubscription?.unsubscribe();
            customersSubscription?.unsubscribe();
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [unitsData, customersData, unitTypesData, unitStatusesData] = await Promise.all([
                unitsService.getAll(),
                customersService.getAll(),
                unitTypesService.getAll(),
                unitStatusesService.getAll()
            ]);
            setUnits(unitsData);
            setCustomers(customersData);
            setUnitTypes(unitTypesData as UnitType[]);
            setUnitStatuses(unitStatusesData as UnitStatus[]);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (unit: Unit | null) => {
        setEditingUnit(unit);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingUnit(null);
        setIsModalOpen(false);
    };

    const handleSave = async (unitData: Omit<Unit, 'id'>) => {
        try {
            if (editingUnit) {
                await unitsService.update(editingUnit.id, unitData);
                logActivity('Update Unit', `Updated unit: ${unitData.name}`);
                addToast('تم تحديث الوحدة بنجاح', 'success');
            } else {
                await unitsService.create(unitData);
                logActivity('Add Unit', `Added unit: ${unitData.name}`);
                addToast('تم إضافة الوحدة بنجاح', 'success');
            }
            handleCloseModal();
            await loadData();
        } catch (error) {
            console.error('Error saving unit:', error);
            addToast('خطأ في حفظ الوحدة', 'error');
        }
    };

    const handleDelete = (unit: Unit) => {
        setUnitToDelete(unit);
    };

    const confirmDelete = async () => {
        if (unitToDelete) {
            try {
                // First, delete all bookings associated with this unit
                const relatedBookings = await bookingsService.getByUnitId(unitToDelete.id);
                for (const booking of relatedBookings) {
                    await bookingsService.delete(booking.id);
                }
                
                // Then delete the unit
                await unitsService.delete(unitToDelete.id);
                logActivity('Delete Unit', `Deleted unit: ${unitToDelete.name}`);
                addToast('تم حذف الوحدة والحجوزات المرتبطة بنجاح', 'success');
                setUnitToDelete(null);
                await loadData();
            } catch (error) {
                console.error('Error deleting unit:', error);
                addToast('خطأ في حذف الوحدة', 'error');
            }
        }
    };
    
    const getStatusStyle = (statusName: string) => {
        switch (statusName) {
            case 'Available': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
            case 'Booked': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            case 'Sold': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الوحدات</h2>
                <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                    إضافة وحدة
                </button>
            </div>

            {units.length > 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-right">
                         <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">النوع</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">السعر</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th>
                         {(canEdit || canDelete) && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                         </tr></thead>
                        <tbody>
                            {units.map(unit => (
                                <tr key={unit.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">{unit.name}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{unit.type}</td>
                                    <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(unit.status)}`}>{unit.status}</span></td>
                                    <td className="p-4 font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(unit.price)}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{unit.customerName || '—'}</td>
                                    {(canEdit || canDelete) && (
                                        <td className="p-4">
                                            {canEdit && <button onClick={() => handleOpenModal(unit)} className="text-primary-600 hover:underline font-semibold">تعديل</button>}
                                            {canDelete && <button onClick={() => handleDelete(unit)} className="text-rose-600 hover:underline mr-4 font-semibold">حذف</button>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState Icon={UnitsEmptyIcon} title="لا توجد وحدات" message="ابدأ بإضافة الوحدات العقارية الخاصة بك." actionButton={{ text: 'إضافة وحدة', onClick: () => handleOpenModal(null)}} />
            )}
            
            {isModalOpen && <UnitPanel unit={editingUnit} unitTypes={unitTypes} unitStatuses={unitStatuses} customers={customers} onClose={handleCloseModal} onSave={handleSave} />}
            <ConfirmModal isOpen={!!unitToDelete} onClose={() => setUnitToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف الوحدة "${unitToDelete?.name}"؟`} />
        </div>
    );
};

interface PanelProps { unit: Unit | null; unitTypes: UnitType[]; unitStatuses: UnitStatus[]; customers: Customer[]; onClose: () => void; onSave: (data: Omit<Unit, 'id'>) => void; }

const UnitPanel: React.FC<PanelProps> = ({ unit, unitTypes, unitStatuses, customers, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: unit?.name || '',
        type: unit?.type || '',
        status: unit?.status || 'Available',
        price: unit?.price || 0,
        customerId: unit?.customerId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.type || formData.price <= 0) {
            addToast('يرجى ملء جميع الحقول الإلزامية.', 'error');
            return;
        }
        const customerName = customers.find(c => c.id === formData.customerId)?.name;
        onSave({ ...formData, customerName });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    };

    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{unit ? 'تعديل وحدة' : 'إضافة وحدة جديدة'}</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <input type="text" name="name" placeholder="اسم الوحدة (مثال: شقة A-101)" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                             <select name="type" value={formData.type} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required><option value="">اختر النوع</option>{unitTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select>
                             <input type="number" name="price" placeholder="السعر" value={formData.price} onChange={handleChange} className={inputStyle} required min="1" />
                        </div>
                         <select name="status" value={formData.status} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required><option value="">اختر الحالة</option>{unitStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}</select>
                         <select name="customerId" value={formData.customerId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`}><option value="">ربط بعميل (اختياري)</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};

export default Units;