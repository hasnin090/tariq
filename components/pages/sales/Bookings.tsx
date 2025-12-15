import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Unit, Customer, Payment, Account, Transaction } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import { filterBookingsByProject } from '../../../utils/projectFilters';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { bookingsService, unitsService, customersService, paymentsService, accountsService, documentsService } from '../../../src/services/supabaseService';
import ConfirmModal from '../../shared/ConfirmModal';
import Modal from '../../shared/Modal';
import DocumentManager from '../../shared/DocumentManager';
import CompactDocumentUploader from '../../shared/CompactDocumentUploader';
import PaymentTimeline from '../../shared/PaymentTimeline';
import { CloseIcon, DocumentTextIcon, EditIcon } from '../../shared/Icons';

export const Bookings: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);

    // Filter bookings by active project
    const filteredBookings = useMemo(() => {
        return filterBookingsByProject(bookings, units, activeProject?.id || null);
    }, [bookings, units, activeProject]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [bookingPayments, setBookingPayments] = useState<Map<string, { totalPaid: number, paymentCount: number }>>(new Map());
    const [allPayments, setAllPayments] = useState<Payment[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
    const [selectedBookingForDocs, setSelectedBookingForDocs] = useState<Booking | null>(null);
    
    // New: PaymentTimeline state
    const [showPaymentTimeline, setShowPaymentTimeline] = useState(false);
    const [selectedBookingPayments, setSelectedBookingPayments] = useState<Payment[]>([]);
    const [selectedUnitPrice, setSelectedUnitPrice] = useState(0);

    const handleOpenDocManager = (booking: Booking) => {
        setSelectedBookingForDocs(booking);
        setIsDocManagerOpen(true);
    };

    const handleCloseDocManager = () => {
        setSelectedBookingForDocs(null);
        setIsDocManagerOpen(false);
    };

    useEffect(() => {
        loadData();
        
        const bookingsSubscription = bookingsService.subscribe((data) => {
            setBookings(data);
        });

        const unitsSubscription = unitsService.subscribe((data) => {
            setUnits(data);
        });

        const customersSubscription = customersService.subscribe((data) => {
            setCustomers(data);
        });

        const paymentsSubscription = paymentsService.subscribe((paymentsData) => {
            setAllPayments(paymentsData);
            // Recalculate total payments per booking
            const paymentsMap = new Map<string, { totalPaid: number, paymentCount: number }>();
            paymentsData.forEach(payment => {
                const existing = paymentsMap.get(payment.bookingId) || { totalPaid: 0, paymentCount: 0 };
                paymentsMap.set(payment.bookingId, {
                    totalPaid: existing.totalPaid + payment.amount,
                    paymentCount: existing.paymentCount + 1
                });
            });
            setBookingPayments(paymentsMap);
        });

        return () => {
            bookingsSubscription?.unsubscribe();
            unitsSubscription?.unsubscribe();
            customersSubscription?.unsubscribe();
            paymentsSubscription?.unsubscribe();
        };
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [bookingsData, unitsData, customersData, accountsData, paymentsData] = await Promise.all([
                bookingsService.getAll(),
                unitsService.getAll(),
                customersService.getAll(),
                accountsService.getAll(),
                paymentsService.getAll(),
            ]);
            setBookings(bookingsData);
            setUnits(unitsData);
            setCustomers(customersData);
            setAccounts(accountsData);
            setAllPayments(paymentsData);
            
            // Calculate total payments per booking
            const paymentsMap = new Map<string, { totalPaid: number, paymentCount: number }>();
            paymentsData.forEach(payment => {
                const existing = paymentsMap.get(payment.bookingId) || { totalPaid: 0, paymentCount: 0 };
                paymentsMap.set(payment.bookingId, {
                    totalPaid: existing.totalPaid + payment.amount,
                    paymentCount: existing.paymentCount + 1
                });
            });
            setBookingPayments(paymentsMap);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (booking: Booking | null) => {
        setEditingBooking(booking);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingBooking(null);
        setIsModalOpen(false);
    };

    // New: Open Payment Timeline
    const handleShowPaymentTimeline = async (booking: Booking) => {
        try {
            const unit = units.find(u => u.id === booking.unitId);
            const payments = await paymentsService.getByBookingId(booking.id);
            
            setSelectedBookingPayments(payments);
            setSelectedUnitPrice(unit?.price || 0);
            setShowPaymentTimeline(true);
        } catch (error) {
            console.error('Error loading payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        }
    };

    const handleClosePaymentTimeline = () => {
        setShowPaymentTimeline(false);
        setSelectedBookingPayments([]);
    };

    const handleEditPayment = (paymentId: string, currentAmount: number, isBooking: boolean) => {
        if (!canEditPayment) {
            addToast('ليس لديك صلاحية لتعديل المدفوعات', 'error');
            return;
        }
        setEditingPayment({ id: paymentId, amount: currentAmount, isBooking });
    };

    const handleSavePaymentEdit = async () => {
        if (!editingPayment || !selectedBookingForPayments) return;
        
        try {
            // Get unit price for validation
            const unit = units.find(u => u.id === selectedBookingForPayments.unitId);
            if (!unit) {
                addToast('الوحدة غير موجودة', 'error');
                return;
            }

            // ✅ CRITICAL: Calculate total and validate
            const bookingPaymentsList = allPayments.filter(p => p.bookingId === selectedBookingForPayments.id);
            
            let totalPaid = 0;
            if (editingPayment.isBooking) {
                // If editing booking payment, calculate: new booking payment + all additional payments
                totalPaid = editingPayment.amount + bookingPaymentsList.reduce((sum, p) => sum + p.amount, 0);
            } else {
                // If editing additional payment, calculate: booking payment + all other additional payments + new amount
                const otherPaymentsTotal = bookingPaymentsList
                    .filter(p => p.id !== editingPayment.id)
                    .reduce((sum, p) => sum + p.amount, 0);
                totalPaid = selectedBookingForPayments.amountPaid + otherPaymentsTotal + editingPayment.amount;
            }

            // Validate: Total should not exceed unit price
            if (totalPaid > unit.price) {
                addToast(
                    `إجمالي المدفوعات ${formatCurrency(totalPaid)} يتجاوز سعر الوحدة ${formatCurrency(unit.price)}`,
                    'error'
                );
                return;
            }

            if (editingPayment.isBooking) {
                // Update booking amount_paid
                await bookingsService.update(selectedBookingForPayments.id, {
                    amountPaid: editingPayment.amount
                } as any);
                logActivity('Update Booking Payment', `Updated booking payment to ${formatCurrency(editingPayment.amount)}`, 'projects');
            } else {
                // Update payment amount
                await paymentsService.update(editingPayment.id, {
                    amount: editingPayment.amount
                } as any);
                logActivity('Update Payment', `Updated payment amount to ${formatCurrency(editingPayment.amount)}`, 'projects');
            }
            
            addToast('تم تحديث المبلغ بنجاح', 'success');
            setEditingPayment(null);
            await loadData();
            
            // Reload payments modal data
            if (selectedBookingForPayments) {
                const updatedPayments = await paymentsService.getAll();
                setAllPayments(updatedPayments);
            }
        } catch (error) {
            console.error('Error updating payment:', error);
            addToast('خطأ في تحديث المبلغ', 'error');
        }
    };

    const handleSave = async (bookingData: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>): Promise<Booking | undefined> => {
        try {
            const unit = units.find(u => u.id === bookingData.unitId);
            const customer = customers.find(c => c.id === bookingData.customerId);
            if (!unit || !customer) {
                addToast('تأكد من اختيار وحدة وعميل صحيحة', 'error');
                return undefined;
            }

            // ✅ CRITICAL: Validate that payment doesn't exceed unit price
            if (bookingData.amountPaid > unit.price) {
                addToast(
                    `المبلغ المدفوع ${formatCurrency(bookingData.amountPaid)} يتجاوز سعر الوحدة ${formatCurrency(unit.price)}`,
                    'error'
                );
                return undefined;
            }

            // Convert camelCase to snake_case for database
            const dbData = {
                unit_id: bookingData.unitId,
                customer_id: bookingData.customerId,
                booking_date: bookingData.bookingDate,
                total_price: unit.price, // إضافة السعر الإجمالي (مطلوب في قاعدة البيانات)
                amount_paid: bookingData.amountPaid,
                // unit_name و customer_name غير موجودين في جدول bookings - يتم جلبهم عبر join
            };

            if (editingBooking) {
                await bookingsService.update(editingBooking.id, dbData as any);
                logActivity('Update Booking', `Updated booking for ${customer.name}`, 'projects');
                addToast('تم تحديث الحجز بنجاح', 'success');
                handleCloseModal();
                await loadData();
                return undefined;
            } else {
                const newBooking = { 
                    ...dbData, 
                    status: 'Active' 
                };
                const createdBooking = await bookingsService.create(newBooking as any);
                
                // Update unit status to 'Booked'
                await unitsService.update(unit.id, { 
                    status: 'Booked'
                } as any);
                
                // ✅ إنشاء سجل دفعة الحجز في جدول payments
                if (bookingData.amountPaid > 0) {
                    await paymentsService.create({
                        bookingId: createdBooking.id,
                        customerId: customer.id,
                        customerName: customer.name,
                        unitId: unit.id,
                        unitName: unit.name,
                        amount: bookingData.amountPaid,
                        paymentDate: bookingData.bookingDate,
                        paymentType: 'booking', // دفعة حجز
                        unitPrice: unit.price,
                        accountId: 'account_default_cash',
                        notes: 'دفعة الحجز الأولى'
                    });
                }
                
                logActivity('Add Booking', `Added booking for ${customer.name} with initial payment of ${formatCurrency(bookingData.amountPaid)}`, 'projects');
                
                addToast('تم إضافة الحجز بنجاح', 'success');
                handleCloseModal();
                await loadData();
                
                // Return the created booking for document upload
                return createdBooking;
            }
        } catch (error) {
            console.error('Error saving booking:', error);
            addToast('خطأ في حفظ الحجز', 'error');
        }
    };
    
    const handleCancelRequest = (booking: Booking) => {
        setBookingToCancel(booking);
    };
    
    const confirmCancel = async () => {
        if (!bookingToCancel) return;
        try {
            // تحديث حالة الحجز إلى ملغي
            await bookingsService.update(bookingToCancel.id, { status: 'Cancelled' } as any);
            
            // البحث عن الوحدة وتحديث حالتها
            const unit = units.find(u => u.id === bookingToCancel.unitId);
            
            if (unit) {
                await unitsService.update(unit.id, { status: 'Available' } as any);
            } else if (bookingToCancel.unitId) {
                // محاولة التحديث مباشرة باستخدام unitId من الحجز
                await unitsService.update(bookingToCancel.unitId, { status: 'Available' } as any);
            }
            
            logActivity('Cancel Booking', `Cancelled booking for unit ${bookingToCancel.unitName}`, 'projects');
            addToast('تم إلغاء الحجز بنجاح وإعادة الوحدة إلى متاح', 'success');
            setBookingToCancel(null);
            await loadData();
        } catch (error) {
            console.error('❌ Error canceling booking:', error);
            addToast('خطأ في إلغاء الحجز: ' + (error as any).message, 'error');
        }
    };
    
    const getStatusStyle = (status: Booking['status']) => {
        switch (status) {
            case 'Active': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            case 'Cancelled': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';
            case 'Completed': return 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    
    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الحجوزات</h2>
                <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                    حجز جديد
                </button>
            </div>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />
            
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600">
                    <table className="w-full text-right min-w-[900px]">
                    <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الحجز</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">سعر الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجمالي المدفوع</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">عدد الدفعات</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المتبقي</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th></tr></thead>
                    <tbody>
                        {filteredBookings.filter(booking => booking.status !== 'Cancelled').map(booking => {
                            const unit = units.find(u => u.id === booking.unitId);
                            const unitPrice = unit?.price || 0;
                            const bookingPaymentInfo = bookingPayments.get(booking.id);
                            // booking.amountPaid يتم تحديثه تلقائياً بواسطة trigger ليكون مجموع كل المدفوعات
                            const totalPaid = bookingPaymentInfo?.totalPaid || booking.amountPaid || 0;
                            const paymentCount = bookingPaymentInfo?.paymentCount || (booking.amountPaid > 0 ? 1 : 0);
                            const remainingAmount = unitPrice - totalPaid;
                            return (
                            <tr key={booking.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{booking.unitName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.customerName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.bookingDate}</td>
                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(unitPrice)}</td>
                                <td 
                                    onClick={() => handleShowPaymentTimeline(booking)}
                                    className="p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                                            {formatCurrency(totalPaid)}
                                        </span>
                                        <span className="text-xs text-slate-400">/ {formatCurrency(unitPrice)}</span>
                                    </div>
                                </td>
                                <td 
                                    onClick={() => handleShowPaymentTimeline(booking)}
                                    className="p-4 text-center cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                                        <span>📋</span>
                                        <span>{paymentCount}</span>
                                    </span>
                                </td>
                                <td className="p-4 font-semibold">
                                    <span className={remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                        {remainingAmount === 0 ? '✅ مكتمل' : formatCurrency(remainingAmount)}
                                    </span>
                                </td>
                                <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(booking.status)}`}>{booking.status}</span></td>
                                <td className="p-4 space-x-4">
                                    <button onClick={() => handleOpenDocManager(booking)} className="text-teal-600 hover:underline font-semibold">المرفقات</button>
                                    {booking.status === 'Active' && <button onClick={() => handleCancelRequest(booking)} className="text-rose-600 dark:text-rose-400 hover:underline font-semibold">إلغاء</button>}
                                </td>
                            </tr>
                        );
                        })}
                    </tbody>
                </table>
                </div>
                 {bookings.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">لا توجد حجوزات حالية.</p>}
            </div>
            {isModalOpen && <BookingPanel booking={editingBooking} units={units} customers={customers} accounts={accounts} onClose={handleCloseModal} onSave={handleSave} />}
            {isDocManagerOpen && selectedBookingForDocs && (
                <DocumentManager
                    isOpen={isDocManagerOpen}
                    onClose={handleCloseDocManager}
                    entityId={selectedBookingForDocs.id}
                    entityType="booking"
                    entityName={`حجز ${selectedBookingForDocs.unitName}`}
                    directView={true}
                />
            )}
            <ConfirmModal isOpen={!!bookingToCancel} onClose={() => setBookingToCancel(null)} onConfirm={confirmCancel} title="تأكيد إلغاء الحجز" message={`هل أنت متأكد من إلغاء حجز الوحدة "${bookingToCancel?.unitName}"؟ ستعود الوحدة متاحة.`} />
            
            {/* Payment Timeline Modal */}
            {showPaymentTimeline && (
                <PaymentTimeline
                    payments={selectedBookingPayments}
                    unitPrice={selectedUnitPrice}
                    onClose={handleClosePaymentTimeline}
                />
            )}
            
            {/* Old Payments Modal - Keeping for backward compatibility, can be removed later */}
            {false && showPaymentsModal && selectedBookingForPayments && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pt-20">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    تفاصيل الدفعات - {selectedBookingForPayments.unitName}
                                </h3>
                                <button onClick={handleClosePaymentsModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <CloseIcon className="h-6 w-6" />
                                </button>
                            </div>

                            {(() => {
                                const unit = units.find(u => u.id === selectedBookingForPayments.unitId);
                                const unitPrice = unit?.price || 0;
                                const bookingPaymentsList = allPayments.filter(p => p.bookingId === selectedBookingForPayments.id);
                                const totalFromPayments = bookingPaymentsList.reduce((sum, p) => sum + p.amount, 0);
                                // استخدام مجموع المدفوعات من جدول payments فقط (لأن دفعة الحجز موجودة هناك)
                                const totalPaid = totalFromPayments;
                                const remainingAmount = unitPrice - totalPaid;

                                return (
                                    <>
                                        {/* Summary Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4">
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">سعر الوحدة</p>
                                                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(unitPrice)}</p>
                                            </div>
                                            <div className="bg-emerald-100 dark:bg-emerald-900 rounded-lg p-4">
                                                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-1">إجمالي المدفوع</p>
                                                <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200">{formatCurrency(totalPaid)}</p>
                                            </div>
                                            <div className="bg-amber-100 dark:bg-amber-900 rounded-lg p-4">
                                                <p className="text-sm text-amber-700 dark:text-amber-300 mb-1">المبلغ المتبقي</p>
                                                <p className="text-xl font-bold text-amber-800 dark:text-amber-200">{formatCurrency(remainingAmount)}</p>
                                            </div>
                                            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4">
                                                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">عدد الدفعات</p>
                                                <p className="text-xl font-bold text-blue-800 dark:text-blue-200">{bookingPaymentsList.length}</p>
                                            </div>
                                        </div>

                                        {/* Payments Table */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-right">
                                                <thead>
                                                    <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                                        <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">#</th>
                                                        <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">التاريخ</th>
                                                        <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">النوع</th>
                                                        <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ</th>
                                                        <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">المتبقي بعد الدفع</th>
                                                        {canEditPayment && (
                                                            <th className="p-3 font-bold text-sm text-slate-700 dark:text-slate-200">تعديل</th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* All Payments from payments table */}
                                                    {bookingPaymentsList.map((payment, index) => {
                                                        const paidSoFar = bookingPaymentsList.slice(0, index + 1).reduce((sum, p) => sum + p.amount, 0);
                                                        const remainingAfterThis = unitPrice - paidSoFar;
                                                        const isBookingPayment = payment.paymentType === 'booking';
                                                        
                                                        return (
                                                            <tr key={payment.id} className={`border-b border-slate-200 dark:border-slate-700 ${isBookingPayment ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                                                <td className="p-3 font-semibold">{index + 1}</td>
                                                                <td className="p-3">{payment.paymentDate}</td>
                                                                <td className="p-3">
                                                                    <span className={`inline-block px-2 py-1 ${isBookingPayment ? 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'} rounded text-xs font-semibold`}>
                                                                        {isBookingPayment ? 'دفعة الحجز' : payment.paymentType === 'installment' ? 'قسط' : 'دفعة إضافية'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">
                                                                    {editingPayment?.id === payment.id ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <input
                                                                                type="number"
                                                                                value={editingPayment.amount}
                                                                                onChange={(e) => setEditingPayment({ ...editingPayment, amount: parseFloat(e.target.value) || 0 })}
                                                                                step="0.01"
                                                                                className="w-32 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                                            />
                                                                            <button
                                                                                onClick={handleSavePaymentEdit}
                                                                                className="px-3 py-1 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm"
                                                                            >
                                                                                حفظ
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingPayment(null)}
                                                                                className="px-3 py-1 bg-slate-400 text-white rounded hover:bg-slate-500 text-sm"
                                                                            >
                                                                                إلغاء
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        formatCurrency(payment.amount)
                                                                    )}
                                                                </td>
                                                                <td className="p-3 font-semibold">
                                                                    {remainingAfterThis === 0 ? (
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">✅ مكتمل</span>
                                                                    ) : remainingAfterThis < 0 ? (
                                                                        <span className="text-rose-600 dark:text-rose-400">تجاوز بـ {formatCurrency(Math.abs(remainingAfterThis))}</span>
                                                                    ) : (
                                                                        <span className="text-amber-600 dark:text-amber-400">{formatCurrency(remainingAfterThis)}</span>
                                                                    )}
                                                                </td>
                                                                {canEditPayment && (
                                                                    <td className="p-3">
                                                                        {editingPayment?.id !== payment.id && (
                                                                            <button
                                                                                onClick={() => handleEditPayment(payment.id, payment.amount, false)}
                                                                                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                                                title="تعديل المبلغ"
                                                                            >
                                                                                <EditIcon />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                    
                                                    {/* Empty state if no payments */}
                                                    {bookingPaymentsList.length === 0 && (
                                                        <tr>
                                                            <td colSpan={canEditPayment ? 6 : 5} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                                لا توجد دفعات مسجلة لهذا الحجز
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {remainingAmount === 0 && (
                                            <div className="mt-6 p-4 bg-emerald-100 dark:bg-emerald-900 rounded-lg text-center">
                                                <p className="text-emerald-800 dark:text-emerald-200 font-bold text-lg">
                                                    ✓ تم سداد المبلغ بالكامل
                                                </p>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleClosePaymentsModal}
                                    className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                >
                                    إغلاق
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface PanelProps { booking: Booking | null; units: Unit[]; customers: Customer[]; accounts: Account[]; onClose: () => void; onSave: (data: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => void; }

const BookingPanel: React.FC<PanelProps> = ({ booking, units, customers, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const [formData, setFormData] = useState({
        unitId: booking?.unitId || '',
        customerId: booking?.customerId || '',
        bookingDate: booking?.bookingDate || new Date().toISOString().split('T')[0],
        amountPaid: booking?.amountPaid || 0,
        accountId: accounts.length > 0 ? accounts[0].id : '',
    });
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.unitId || !formData.customerId) {
            addToast('يرجى اختيار وحدة وعميل.', 'error');
            return;
        }
        
        // Save booking first
        const savedBooking = await onSave(formData);
        
        // Upload documents if any and if booking is new
        if (!booking && uploadFiles.length > 0 && savedBooking) {
            try {
                for (const file of uploadFiles) {
                    await documentsService.upload(file, { booking_id: savedBooking.id });
                }
                addToast('تم رفع المستندات بنجاح', 'success');
            } catch (error) {
                console.error('Error uploading documents:', error);
                addToast('تم حفظ الحجز لكن فشل رفع بعض المستندات', 'warning');
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amountPaid' ? Number(value) : value }));
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={booking ? 'تعديل حجز' : 'حجز جديد'}
            size="md"
            footer={
                <div className="flex justify-end gap-4 w-full">
                    <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                    <button type="submit" form="booking-form" className="btn-primary">حفظ</button>
                </div>
            }
        >
            <form id="booking-form" onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                    <div>
                        <label className="input-label">الوحدة <span className="text-rose-400">*</span></label>
                        <select name="unitId" value={formData.unitId} onChange={handleChange} className="input-field" required>
                            <option value="">اختر وحدة</option>
                            {units
                                .filter(u => {
                                    // عند التعديل، اسمح بالوحدة الحالية فقط
                                    if (booking) return u.id === booking.unitId;
                                    // عند الإضافة، اعرض فقط الوحدات المتاحة (Available أو متاح)
                                    return u.status === 'Available' || u.status === 'متاح';
                                })
                                .map(u => <option key={u.id} value={u.id}>{`${u.name} (${formatCurrency(u.price)})`}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="input-label">العميل <span className="text-rose-400">*</span></label>
                        <select name="customerId" value={formData.customerId} onChange={handleChange} className="input-field" required>
                            <option value="">اختر عميل</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="input-label">تاريخ الحجز <span className="text-rose-400">*</span></label>
                        <input type="date" name="bookingDate" value={formData.bookingDate} onChange={handleChange} className="input-field" required />
                    </div>

                    {/* Display unit price info */}
                    {formData.unitId && (() => {
                        const selectedUnit = units.find(u => u.id === formData.unitId);
                        if (!selectedUnit) return null;
                        
                        return (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                <div className="text-sm">
                                    <span className="text-slate-400">سعر الوحدة المحددة:</span>
                                    <p className="text-white font-bold text-lg mt-1">{formatCurrency(selectedUnit.price)}</p>
                                    {formData.amountPaid > 0 && (
                                        <p className="text-amber-400 mt-2">
                                            المتبقي: {formatCurrency(selectedUnit.price - formData.amountPaid)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    <div>
                        <label className="input-label">المبلغ المدفوع مقدماً</label>
                        <input type="number" name="amountPaid" placeholder="0" value={formData.amountPaid || ''} onChange={handleChange} className="input-field" min="0" step="0.01" />
                        <p className="text-xs text-slate-400 mt-1">يجب أن لا يتجاوز المبلغ سعر الوحدة</p>
                    </div>

                    {accounts.length > 0 && (
                        <div>
                            <label className="input-label">حساب الدفع (اختياري)</label>
                            <select name="accountId" value={formData.accountId} onChange={handleChange} className="input-field">
                                <option value="">اختر حساب الدفع</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {/* Document Upload Section - Only show for new bookings */}
                    {!booking && (
                        <div className="pt-2 border-t border-white/20">
                            <CompactDocumentUploader 
                                onFilesChange={setUploadFiles}
                                maxFiles={5}
                            />
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};
