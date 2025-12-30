import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { Unit, UnitType, UnitStatus, Customer } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { unitsService, customersService, unitTypesService, unitStatusesService, bookingsService, documentsService, paymentsService } from '../../../src/services/supabaseService';
import ConfirmModal from '../../shared/ConfirmModal';
import { CloseIcon, BuildingIcon, EditIcon, TrashIcon, UnitsEmptyIcon } from '../../shared/Icons';
import EmptyState from '../../shared/EmptyState';
import ProjectSelector from '../../shared/ProjectSelector';
import { useButtonPermissions } from '../../../hooks/useButtonPermission';
import gsap from 'gsap';
import AmountInput from '../../shared/AmountInput';

const Units: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const { canShow } = useButtonPermissions();
    const [units, setUnits] = useState<Unit[]>([]);
    const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
    const [unitStatuses, setUnitStatuses] = useState<UnitStatus[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
    const [loading, setLoading] = useState(true);
    
    // GSAP Table Animation Ref
    const tableBodyRef = useRef<HTMLTableSectionElement>(null);
    const hasAnimated = useRef(false);

    const canEdit = currentUser?.role === 'Admin' || canShow('units', 'edit');
    const canDelete = currentUser?.role === 'Admin' || canShow('units', 'delete');
    const canAdd = canShow('units', 'add');

    // Filter units by active project
    const filteredUnits = useMemo(() => {
        if (!activeProject) return units;
        return units.filter(unit => unit.projectId === activeProject.id);
    }, [units, activeProject]);

    // 🎬 GSAP Table Animation - runs only once
    useLayoutEffect(() => {
        if (tableBodyRef.current && !loading && filteredUnits.length > 0 && !hasAnimated.current) {
            hasAnimated.current = true;
            const rows = tableBodyRef.current.querySelectorAll('tr');
            gsap.fromTo(rows,
                { opacity: 0, y: 15, x: -10 },
                {
                    opacity: 1,
                    y: 0,
                    x: 0,
                    duration: 0.35,
                    stagger: 0.04,
                    ease: "power2.out",
                    delay: 0.1
                }
            );
        }
    }, [filteredUnits, loading]);

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
            console.log('🔵 Saving unit with data:', unitData);
            if (editingUnit) {
                await unitsService.update(editingUnit.id, unitData);
                logActivity('Update Unit', `Updated unit: ${unitData.name}`, 'projects');
                addToast('تم تحديث الوحدة بنجاح', 'success');
            } else {
                await unitsService.create(unitData);
                logActivity('Add Unit', `Added unit: ${unitData.name}`, 'projects');
                addToast('تم إضافة الوحدة بنجاح', 'success');
            }
            handleCloseModal();
            await loadData();
        } catch (error: any) {
            console.error('❌ Error saving unit:', error);
            console.error('Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
            });
            const errorMessage = error?.message || error?.hint || 'خطأ غير معروف';
            addToast(`خطأ في حفظ الوحدة: ${errorMessage}`, 'error');
        }
    };

    const handleDelete = (unit: Unit) => {
        setUnitToDelete(unit);
    };

    const confirmDelete = async () => {
        if (unitToDelete) {
            try {
                // First, get all bookings associated with this unit
                const relatedBookings = await bookingsService.getByUnitId(unitToDelete.id);
                
                // Check if there are any bookings with payments
                const allPayments = await paymentsService.getAll();
                const hasPayments = relatedBookings.some(booking => 
                    allPayments.some(payment => payment.bookingId === booking.id)
                );
                
                if (hasPayments) {
                    addToast('لا يمكن حذف الوحدة: يوجد حجوزات مرتبطة بدفعات. يرجى حذف الدفعات أولاً أو إلغاء الحجوزات.', 'error');
                    setUnitToDelete(null);
                    return;
                }
                
                // Delete associated documents
                for (const booking of relatedBookings) {
                    await documentsService.deleteForBooking(booking.id);
                }
                
                // Delete all bookings
                for (const booking of relatedBookings) {
                    await bookingsService.delete(booking.id);
                }
                
                // Finally delete the unit
                await unitsService.delete(unitToDelete.id);
                logActivity('Delete Unit', `Deleted unit: ${unitToDelete.name}`, 'projects');
                addToast('تم حذف الوحدة والحجوزات والمستندات المرتبطة بنجاح', 'success');
                setUnitToDelete(null);
                await loadData();
            } catch (error: any) {
                console.error('Error deleting unit:', error);
                const errorMessage = error?.message || error?.details || 'خطأ في حذف الوحدة';
                addToast(errorMessage, 'error');
                setUnitToDelete(null);
            }
        }
    };
    
    const getStatusStyle = (statusName: string) => {
        switch (statusName) {
            case 'Available':
            case 'متاح': 
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
            case 'Booked':
            case 'محجوز': 
                return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            case 'Sold':
            case 'مباع': 
                return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';
            default: 
                return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الوحدات</h2>
                {canAdd && (
                    <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                        إضافة وحدة
                    </button>
                )}
            </div>

            {/* Project Selector */}
            <ProjectSelector 
                projects={availableProjects}
                activeProject={activeProject}
                onSelectProject={setActiveProject}
            />

            {filteredUnits.length > 0 ? (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                        <table className="w-full text-right min-w-[700px]">
                             <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">رقم الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المساحة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">السعر</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th>
                         {(canEdit || canDelete) && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                         </tr></thead>
                        <tbody ref={tableBodyRef}>
                            {filteredUnits.map(unit => (
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
                </div>
            ) : (
                <EmptyState Icon={UnitsEmptyIcon} title="لا توجد وحدات" message="ابدأ بإضافة الوحدات العقارية الخاصة بك." actionButton={canAdd ? { text: 'إضافة وحدة', onClick: () => handleOpenModal(null)} : undefined} />
            )}
            
            {isModalOpen && <UnitPanel unit={editingUnit} unitTypes={unitTypes} unitStatuses={unitStatuses} customers={customers} activeProjectId={activeProject?.id} onClose={handleCloseModal} onSave={handleSave} />}
            <ConfirmModal isOpen={!!unitToDelete} onClose={() => setUnitToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف الوحدة "${unitToDelete?.name}"؟`} />
        </div>
    );
};

interface PanelProps { unit: Unit | null; unitTypes: UnitType[]; unitStatuses: UnitStatus[]; customers: Customer[]; activeProjectId?: string; onClose: () => void; onSave: (data: Omit<Unit, 'id'>) => void; }

const UnitPanel: React.FC<PanelProps> = ({ unit, unitTypes, unitStatuses, customers, activeProjectId, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: unit?.name || '',
        type: unit?.type || '',
        status: unit?.status || (unitStatuses.length > 0 ? unitStatuses[0].name : 'Available'),
        price: unit?.price || 0,
        customerId: unit?.customerId || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.type || formData.price <= 0) {
            addToast('يرجى ملء جميع الحقول الإلزامية.', 'error');
            return;
        }
        
        if (!unit && !activeProjectId) {
             addToast('يرجى اختيار مشروع أولاً', 'error');
             return;
        }

        // تحويل customerId الفارغ إلى null
        const dataToSave = {
            ...formData,
            customerId: formData.customerId || null, // تحويل string فارغ إلى null
            projectId: unit?.projectId || activeProjectId
        };

        // Don't send customerName - it will be fetched via join
        onSave(dataToSave as any);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    };

    return (
         <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-md flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 w-full max-w-2xl animate-scale-up overflow-hidden" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(100vh-6rem)]">
                    <div className="px-8 py-5 border-b border-white/20 flex justify-between items-center bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm">
                        <h2 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">{unit ? 'تعديل وحدة' : 'إضافة وحدة جديدة'}</h2>
                        <button type="button" onClick={onClose} className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-rose-500/30 hover:text-rose-100 transition-all duration-300 border border-white/20 hover:scale-110 active:scale-95">
                            <CloseIcon className="h-5 w-5"/>
                        </button>
                    </div>
                    <div className="px-8 py-6 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-white/5">
                        <div>
                            <label className="input-label">رقم الوحدة <span className="text-rose-400">*</span></label>
                            <input type="text" name="name" placeholder="مثال: A-101" value={formData.name} onChange={handleChange} className="input-field" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">المساحة <span className="text-rose-400">*</span></label>
                                <select name="type" value={formData.type} onChange={handleChange} className="input-field" required>
                                    <option value="">اختر المساحة</option>
                                    {unitTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">السعر <span className="text-rose-400">*</span></label>
                                <AmountInput
                                    value={formData.price || ''}
                                    onValueChange={(price) => setFormData(prev => ({ ...prev, price: price === '' ? 0 : price }))}
                                    className="input-field"
                                    placeholder="سعر الوحدة"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="input-label">الحالة <span className="text-rose-400">*</span></label>
                            <select name="status" value={formData.status} onChange={handleChange} className="input-field" required>
                                <option value="">اختر الحالة</option>
                                {unitStatuses.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="input-label">ربط بعميل (اختياري)</label>
                            <select name="customerId" value={formData.customerId} onChange={handleChange} className="input-field">
                                <option value="">بدون عميل</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="px-8 py-5 border-t border-white/20 bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                        <button type="submit" className="btn-primary">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Units;
