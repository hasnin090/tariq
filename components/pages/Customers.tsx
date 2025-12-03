import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Unit, Payment, Booking } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from '../shared/ProjectSelector';
import { filterCustomersByProject } from '../../utils/projectFilters';
import logActivity from '../../utils/activityLogger';
import { customersService, unitsService, documentsService, paymentsService, bookingsService } from '../../src/services/supabaseService';
import ConfirmModal from '../shared/ConfirmModal';
import { CloseIcon, UsersIcon, CustomersEmptyIcon, DocumentTextIcon, PaperClipIcon } from '../shared/Icons';
import EmptyState from '../shared/EmptyState';
import DocumentManager from '../shared/DocumentManager';
import Modal from '../shared/Modal';
import { formatCurrency } from '../../utils/currencyFormatter';

const Customers: React.FC = () => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Filter customers by active project
    const filteredCustomers = useMemo(() => {
        if (currentUser?.assignedProjectId) {
            // For assigned users, only show customers from their project
            return customers.filter(c => c.projectId === currentUser.assignedProjectId);
        } else if (activeProject) {
            // For admin users, filter by selected project
            return customers.filter(c => c.projectId === activeProject.id);
        }
        // Show all customers if no project filter
        return customers;
    }, [customers, activeProject, currentUser]);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
    const [selectedCustomerForDocs, setSelectedCustomerForDocs] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCustomerForPayments, setSelectedCustomerForPayments] = useState<Customer | null>(null);
    const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
    const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
    const [loadingPayments, setLoadingPayments] = useState(false);

    const canEdit = currentUser?.role === 'Admin';
    const canDelete = currentUser?.role === 'Admin';
    const canManageDocs = currentUser?.role === 'Admin';

    useEffect(() => {
        loadData();
        
        // Subscribe to real-time changes
        const subscription = customersService.subscribe((data) => {
            setCustomers(data);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [customersData, unitsData, bookingsData] = await Promise.all([
                customersService.getAll(),
                unitsService.getAll(),
                bookingsService.getAll()
            ]);
            setCustomers(customersData);
            setUnits(unitsData);
            setBookings(bookingsData);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (customer: Customer | null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(false);
    };

    const handleOpenDocManager = (customer: Customer) => {
        setSelectedCustomerForDocs(customer);
        setIsDocManagerOpen(true);
    };

    const handleCloseDocManager = () => {
        setSelectedCustomerForDocs(null);
        setIsDocManagerOpen(false);
    };

    const handleViewCustomerPayments = async (customer: Customer) => {
        setSelectedCustomerForPayments(customer);
        setIsPaymentsModalOpen(true);
        setLoadingPayments(true);
        
        try {
            const [paymentsData, bookingsData] = await Promise.all([
                paymentsService.getAll(),
                bookingsService.getAll()
            ]);
            
            const customerPaymentsFiltered = paymentsData.filter(p => p.customerId === customer.id);
            const customerBookingsFiltered = bookingsData.filter(b => b.customerId === customer.id);
            
            setCustomerPayments(customerPaymentsFiltered);
            setCustomerBookings(customerBookingsFiltered);
        } catch (error) {
            console.error('Error loading customer payments:', error);
            addToast('خطأ في تحميل بيانات الدفعات', 'error');
        } finally {
            setLoadingPayments(false);
        }
    };

    const handleClosePaymentsModal = () => {
        setIsPaymentsModalOpen(false);
        setSelectedCustomerForPayments(null);
        setCustomerPayments([]);
        setCustomerBookings([]);
    };

    const handleSave = async (customerData: Omit<Customer, 'id'>, documents?: File[]) => {
        try {
            const { unitId, unit_id, ...customerWithoutUnit } = customerData as any;
            const unitIdValue = unitId || unit_id;
            
            let savedCustomer;
            if (editingCustomer) {
                savedCustomer = await customersService.update(editingCustomer.id, customerWithoutUnit);
                logActivity('Update Customer', `Updated customer: ${customerWithoutUnit.name}`);
                addToast('تم تحديث العميل بنجاح', 'success');
            } else {
                savedCustomer = await customersService.create(customerWithoutUnit);
                logActivity('Add Customer', `Added customer: ${customerWithoutUnit.name}`);
                addToast('تم إضافة العميل بنجاح', 'success');
            }

            if (savedCustomer && documents && documents.length > 0) {
                for (const doc of documents) {
                    await documentsService.upload(doc, { customer_id: savedCustomer.id });
                }
                addToast(`تم رفع ${documents.length} مستندات بنجاح`, 'success');
            }

            if (unitIdValue) {
                await unitsService.update(unitIdValue, {
                    status: 'Sold',
                    customerId: savedCustomer.id
                });
                logActivity('Update Unit Status', `Unit ${unitIdValue} marked as Sold`);
            }

            handleCloseModal();
            await loadData();
        } catch (error) {
            console.error('Error saving customer:', error);
            addToast('خطأ في حفظ العميل', 'error');
        }
    };

    const handleDelete = async (customer: Customer) => {
        setCustomerToDelete(customer);
    };

    const confirmDelete = async () => {
        if (customerToDelete) {
            try {
                await customersService.delete(customerToDelete.id);
                logActivity('Delete Customer', `Deleted customer: ${customerToDelete.name}`);
                addToast('تم حذف العميل بنجاح', 'success');
                setCustomerToDelete(null);
                await loadData();
            } catch (error) {
                console.error('Error deleting customer:', error);
                addToast('خطأ في حذف العميل', 'error');
            }
        }
    };
    
    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة العملاء</h2>
                <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-sm">
                    إضافة عميل
                </button>
            </div>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />
            
             {filteredCustomers.length > 0 ? (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                        <table className="w-full text-right min-w-[600px]">
                        <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الاسم</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الهاتف</th>
                            <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">البريد الإلكتروني</th>
                            {(canEdit || canDelete) && <th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th>}
                        </tr></thead>
                        <tbody>
                            {filteredCustomers.map(customer => (
                                <tr key={customer.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                    <td className="p-4 font-medium text-slate-800 dark:text-slate-100">
                                        <button 
                                            onClick={() => handleViewCustomerPayments(customer)}
                                            className="text-primary-600 dark:text-primary-400 hover:underline font-semibold transition-colors duration-200 hover:text-primary-700 dark:hover:text-primary-300"
                                        >
                                            {customer.name}
                                        </button>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{customer.phone}</td>
                                     <td className="p-4 text-slate-600 dark:text-slate-300">{customer.email}</td>
                                    {(canEdit || canDelete || canManageDocs) && (
                                        <td className="p-4 space-x-4">
                                            {canManageDocs && <button onClick={() => handleOpenDocManager(customer)} className="text-teal-600 hover:underline font-semibold">المستندات</button>}
                                            {canEdit && <button onClick={() => handleOpenModal(customer)} className="text-primary-600 hover:underline font-semibold">تعديل</button>}
                                            {canDelete && <button onClick={() => handleDelete(customer)} className="text-rose-600 hover:underline font-semibold">حذف</button>}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            ) : (
                <EmptyState Icon={CustomersEmptyIcon} title="لا يوجد عملاء" message="ابدأ بإضافة بيانات العملاء لتتمكن من ربطهم بالوحدات." actionButton={{ text: 'إضافة عميل', onClick: () => handleOpenModal(null)}} />
            )}
            {isModalOpen && <CustomerPanel customer={editingCustomer} units={units} activeProjectId={currentUser?.assignedProjectId || activeProject?.id} onClose={handleCloseModal} onSave={handleSave} />}
            {isDocManagerOpen && selectedCustomerForDocs && (
                <DocumentManager 
                    isOpen={isDocManagerOpen}
                    onClose={handleCloseDocManager}
                    entityId={selectedCustomerForDocs.id}
                    entityType="customer"
                    entityName={selectedCustomerForDocs.name}
                />
            )}
            <ConfirmModal isOpen={!!customerToDelete} onClose={() => setCustomerToDelete(null)} onConfirm={confirmDelete} title="تأكيد الحذف" message={`هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟`} />
            
            {/* Modal for Customer Payments and Bookings */}
            <Modal 
                isOpen={isPaymentsModalOpen} 
                onClose={handleClosePaymentsModal}
                title={`دفعات وحجوزات العميل: ${selectedCustomerForPayments?.name || ''}`}
                size="xl"
            >
                {loadingPayments ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Bookings Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                حجوزات العميل
                            </h3>
                            {customerBookings.length > 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">الوحدة</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">تاريخ الحجز</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">مبلغ الحجز</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerBookings.map(booking => (
                                                <tr key={booking.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{booking.unitName}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{new Date(booking.bookingDate).toLocaleDateString('ar-EG')}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(booking.amountPaid)}</td>
                                                    <td className="p-3">
                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                            booking.status === 'Active' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            booking.status === 'Completed' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                                                            'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
                                                        }`}>
                                                            {booking.status === 'Active' ? 'نشط' : booking.status === 'Completed' ? 'مكتمل' : 'ملغى'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                    لا توجد حجوزات لهذا العميل
                                </div>
                            )}
                        </div>

                        {/* Payments Section */}
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                دفعات العميل
                            </h3>
                            {customerPayments.length > 0 ? (
                                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-right">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">الوحدة</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">تاريخ الدفعة</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">مبلغ الدفعة</th>
                                                <th className="p-3 text-sm font-semibold text-slate-700 dark:text-slate-300">المتبقي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerPayments.map(payment => (
                                                <tr key={payment.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                                    <td className="p-3 text-slate-800 dark:text-slate-200 font-medium">{payment.unitName}</td>
                                                    <td className="p-3 text-slate-600 dark:text-slate-400">{new Date(payment.paymentDate).toLocaleDateString('ar-EG')}</td>
                                                    <td className="p-3 text-green-600 dark:text-green-400 font-semibold">{formatCurrency(payment.amount)}</td>
                                                    <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold">{formatCurrency(payment.remainingAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600">
                                                <td colSpan={2} className="p-3 text-sm font-bold text-slate-700 dark:text-slate-300">إجمالي الدفعات:</td>
                                                <td className="p-3 text-green-600 dark:text-green-400 font-bold text-lg">
                                                    {formatCurrency(customerPayments.reduce((sum, p) => sum + p.amount, 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    لا توجد دفعات لهذا العميل
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};interface PanelProps { customer: Customer | null; units: Unit[]; activeProjectId?: string; onClose: () => void; onSave: (data: Omit<Customer, 'id'>, documents?: File[]) => void; }

const CustomerPanel: React.FC<PanelProps> = ({ customer, units, activeProjectId, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone: customer?.phone || '',
        email: customer?.email || '',
        unit_id: customer?.unitId || '',
    });
    const [documents, setDocuments] = useState<File[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setDocuments(Array.from(e.target.files));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) {
            addToast('الاسم ورقم الهاتف حقول إلزامية.', 'error');
            return;
        }
        // Auto-assign projectId for new customers
        const customerData = {
            ...formData,
            projectId: customer?.projectId || activeProjectId
        };
        onSave(customerData, documents);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };
    
    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
         <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up my-16 max-h-[calc(100vh-8rem)] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start"><h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{customer ? 'تعديل عميل' : 'إضافة عميل جديد'}</h2><button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><CloseIcon className="h-6 w-6"/></button></div>
                    <div className="p-6 space-y-4">
                        <input type="text" name="name" placeholder="الاسم الكامل" value={formData.name} onChange={handleChange} className={inputStyle} required />
                        <div className="grid grid-cols-2 gap-4">
                           <input type="tel" name="phone" placeholder="رقم الهاتف" value={formData.phone} onChange={handleChange} className={inputStyle} required />
                           <input type="email" name="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={handleChange} className={inputStyle} />
                        </div>
                        <div>
                            <label htmlFor="unit_id" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">ربط بوحدة سكنية (اختياري)</label>
                            <select id="unit_id" name="unit_id" value={formData.unit_id} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`}>
                                <option value="">اختر وحدة</option>
                                {units.filter(u => u.status === 'Available' || u.customerId === customer?.id).map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">المستندات الثبوتية</label>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-slate-900/25 dark:border-slate-50/25 px-6 py-10">
                                <div className="text-center">
                                    <PaperClipIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white dark:bg-slate-800 font-semibold text-primary-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-primary-600 focus-within:ring-offset-2 hover:text-primary-500">
                                            <span>ارفع ملفات</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                        </label>
                                        <p className="pr-1">أو اسحبها وأفلتها</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-600">PNG, JPG, PDF up to 10MB</p>
                                </div>
                            </div>
                            {documents.length > 0 && (
                                <div className="mt-2 text-sm text-slate-500">
                                    {documents.map(file => <span key={file.name} className="block">{file.name}</span>)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button><button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button></div>
                </form>
            </div>
        </div>
    );
};


export default Customers;