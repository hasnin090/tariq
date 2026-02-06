import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Unit, Customer, Payment, Account, Transaction } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import { useButtonPermissions } from '../../../hooks/useButtonPermission';
import ProjectSelector from '../../shared/ProjectSelector';
import { filterBookingsByProject } from '../../../utils/projectFilters';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { bookingsService, unitsService, customersService, paymentsService, accountsService, documentsService, scheduledPaymentsService } from '../../../src/services/supabaseService';
import ConfirmModal from '../../shared/ConfirmModal';
import Modal from '../../shared/Modal';
import DocumentManager from '../../shared/DocumentManager';
import CompactDocumentUploader from '../../shared/CompactDocumentUploader';
import PaymentTimeline from '../../shared/PaymentTimeline';
import AmountInput from '../../shared/AmountInput';
import { CloseIcon, DocumentTextIcon, EditIcon } from '../../shared/Icons';
import { PrintContractButton, PrintReceiptButton, QuickPrintMenu } from '../../shared/PrintComponents';
import { BookingInfo, PaymentInfo, CustomerInfo, UnitInfo } from '../../../utils/printService';

export const Bookings: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const { canShow } = useButtonPermissions();
    const canAdd = canShow('bookings', 'add');
    const canEdit = canShow('bookings', 'edit');
    const canDelete = canShow('bookings', 'delete');
    const canEditPayment = currentUser?.role === 'Admin';
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
    const [selectedBookingForPayments, setSelectedBookingForPayments] = useState<Booking | null>(null);
    const [editingPayment, setEditingPayment] = useState<{ id: string; amount: number; isBooking: boolean } | null>(null);
    const [scheduledPaymentsByBooking, setScheduledPaymentsByBooking] = useState<Map<string, any[]>>(new Map());

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

    // ✅ التعامل مع البحث والتنقل للعنصر المحدد
    useEffect(() => {
        let isCancelled = false;
        const timeoutIds: number[] = []; // ✅ تتبع جميع الـ timeouts
        
        const handleSearchNavigate = (e: CustomEvent) => {
            if (e.detail?.page !== 'bookings' || !e.detail?.id) return;
            
            const bookingId = e.detail.id;
            
            // ✅ دالة للبحث مع محاولات متعددة
            const tryFindAndScroll = (attempts = 0) => {
                if (isCancelled) return; // ✅ فحص الإلغاء
                
                const element = document.getElementById(`item-${bookingId}`) || 
                               document.querySelector(`[data-id="${bookingId}"]`);
                
                if (!element && attempts < 10) {
                    const retryTimeout = window.setTimeout(() => tryFindAndScroll(attempts + 1), 300);
                    timeoutIds.push(retryTimeout); // ✅ حفظ الـ timeout
                    return;
                }
                
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('search-highlight');
                    const highlightTimeout = window.setTimeout(() => {
                        if (!isCancelled) element.classList.remove('search-highlight');
                    }, 3000);
                    timeoutIds.push(highlightTimeout); // ✅ حفظ الـ timeout
                } else {
                }
                
                sessionStorage.removeItem('searchFocus');
            };
            
            // بدء البحث بعد تأخير قصير
            const startTimeout = window.setTimeout(() => tryFindAndScroll(0), 200);
            timeoutIds.push(startTimeout); // ✅ حفظ الـ timeout
        };
        
        // فحص عند التحميل
        const searchFocusStr = sessionStorage.getItem('searchFocus');
        if (searchFocusStr && bookings.length > 0) {
            try {
                const searchFocus = JSON.parse(searchFocusStr);
                if (searchFocus.page === 'bookings') {
                    handleSearchNavigate({ detail: searchFocus } as CustomEvent);
                }
            } catch (e) {
                console.error('Error parsing searchFocus:', e);
                sessionStorage.removeItem('searchFocus');
            }
        }
        
        // الاستماع للحدث المخصص
        window.addEventListener('searchNavigate', handleSearchNavigate as EventListener);
        return () => {
            isCancelled = true;
            timeoutIds.forEach(id => clearTimeout(id)); // ✅ تنظيف جميع الـ timeouts
            window.removeEventListener('searchNavigate', handleSearchNavigate as EventListener);
        };
    }, [bookings]);

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
            
            // Load scheduled payments for all bookings
            try {
                const allScheduledPayments = await scheduledPaymentsService.getAll();
                const scheduledMap = new Map<string, any[]>();
                allScheduledPayments.forEach(sp => {
                    if (!scheduledMap.has(sp.bookingId)) {
                        scheduledMap.set(sp.bookingId, []);
                    }
                    scheduledMap.get(sp.bookingId)!.push({
                        installmentNumber: sp.installmentNumber,
                        dueDate: sp.dueDate,
                        amount: sp.amount,
                        status: sp.status,
                        paidDate: sp.paidDate
                    });
                });
                setScheduledPaymentsByBooking(scheduledMap);
            } catch (error) {
                console.warn('Could not load scheduled payments:', error);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (booking: Booking | null) => {
        // ✅ فحص الصلاحيات قبل فتح المودال
        if (booking === null && !canAdd) {
            console.warn('🚫 handleOpenModal blocked: No add permission');
            return;
        }
        if (booking !== null && !canEdit) {
            console.warn('🚫 handleOpenModal blocked: No edit permission');
            return;
        }
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
            setSelectedBookingForPayments(booking);
            setShowPaymentTimeline(true);
        } catch (error) {
            console.error('Error loading payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        }
    };

    const handleClosePaymentTimeline = () => {
        setShowPaymentTimeline(false);
        setSelectedBookingPayments([]);
        setSelectedBookingForPayments(null);
        setEditingPayment(null);
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
            const dbData: any = {
                unit_id: bookingData.unitId,
                customer_id: bookingData.customerId,
                booking_date: bookingData.bookingDate,
                total_price: unit.price, // إضافة السعر الإجمالي (مطلوب في قاعدة البيانات)
                // unit_name و customer_name غير موجودين في جدول bookings - يتم جلبهم عبر join
            };

            // ملاحظة: amount_paid يتم حسابه من جدول payments بواسطة trigger.
            // لذلك لا نكتب amount_paid مباشرة لتجنب تضارب مصدر الحقيقة.
            if (!editingBooking) {
                dbData.amount_paid = 0;
            }
            
            // إضافة حقول خطة الدفع إذا كانت موجودة
            if ((bookingData as any).paymentPlanYears) {
                const paymentPlanYears = (bookingData as any).paymentPlanYears;
                const paymentFrequencyMonths = (bookingData as any).paymentFrequencyMonths || 1;
                const paymentStartDate = (bookingData as any).paymentStartDate;
                
                dbData.payment_plan_years = paymentPlanYears;
                dbData.payment_frequency_months = paymentFrequencyMonths;
                dbData.payment_start_date = paymentStartDate;
            }

            if (editingBooking) {
                const updatedBooking = await bookingsService.update(editingBooking.id, dbData as any);
                logActivity('Update Booking', `Updated booking for ${customer.name}`, 'projects');
                addToast('تم تحديث الحجز بنجاح', 'success');
                handleCloseModal();
                await loadData();
                return updatedBooking;
            } else {
                const newBooking = { 
                    ...dbData, 
                    status: 'Active' 
                };
                const createdBooking = await bookingsService.create(newBooking as any);
                
                // Update unit status to 'Booked' and assign customer
                await unitsService.update(unit.id, { 
                    status: 'Booked',
                    customerId: customer.id
                } as any);
                
                // ✅ إنشاء سجل دفعة الحجز في جدول payments
                if (bookingData.amountPaid > 0) {
                    try {
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
                            accountId: (bookingData as any).accountId || 'account_default_cash',
                            notes: 'دفعة الحجز الأولى'
                        });
                    } catch (paymentError) {
                        console.error('Error creating initial booking payment:', paymentError);
                        addToast('تم إنشاء الحجز لكن فشل تسجيل دفعة الحجز', 'warning');
                    }
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
            // ✅ تحقق من وجود دفعات مجدولة
            const { scheduledPaymentsService } = await import('../../../src/services/supabaseService');
            try {
                const scheduledPayments = await scheduledPaymentsService.getByBookingId(bookingToCancel.id);
                const pendingScheduled = scheduledPayments.filter(sp => sp.status === 'pending' || sp.status === 'overdue');
                
                if (pendingScheduled.length > 0) {
                    const confirmed = window.confirm(
                        `⚠️ تحذير: هذا الحجز له ${scheduledPayments.length} دفعة مجدولة (${pendingScheduled.length} معلقة).\n\nسيتم حذف جميع الدفعات المجدولة عند إلغاء الحجز.\n\nهل تريد المتابعة؟`
                    );
                    if (!confirmed) {
                        setBookingToCancel(null);
                        return;
                    }
                }
            } catch (schedErr) {
                console.warn('Could not check scheduled payments:', schedErr);
            }
            
            // تحديث حالة الحجز إلى ملغي
            await bookingsService.update(bookingToCancel.id, { status: 'Cancelled' } as any);
            
            // البحث عن الوحدة وتحديث حالتها
            const unit = units.find(u => u.id === bookingToCancel.unitId);
            
            if (unit) {
                await unitsService.update(unit.id, { 
                    status: 'Available',
                    customerId: null
                } as any);
            } else if (bookingToCancel.unitId) {
                // محاولة التحديث مباشرة باستخدام unitId من الحجز
                await unitsService.update(bookingToCancel.unitId, { 
                    status: 'Available',
                    customerId: null
                } as any);
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
            case 'Completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
        }
    };
    
    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">إدارة الحجوزات</h2>
                {canAdd && (
                    <button onClick={() => handleOpenModal(null)} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors">
                        حجز جديد
                    </button>
                )}
            </div>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject}
                disabled={!!currentUser?.assignedProjectId}
                showAllProjectsOption={currentUser?.role === 'Admin'}
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
                            const paymentProgress = unitPrice > 0 ? (totalPaid / unitPrice) * 100 : 0;
                            return (
                            <tr key={booking.id} data-id={booking.id} id={`item-${booking.id}`} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{booking.unitName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.customerName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.bookingDate}</td>
                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(unitPrice)}</td>
                                <td 
                                    onClick={() => handleShowPaymentTimeline(booking)}
                                    className="p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                                            {formatCurrency(totalPaid)}
                                        </span>
                                        <span className="text-xs text-slate-400">/ {formatCurrency(unitPrice)}</span>
                                    </div>
                                    {/* 📊 Progress Bar */}
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                                paymentProgress >= 100 
                                                    ? 'bg-emerald-500' 
                                                    : paymentProgress >= 75 
                                                    ? 'bg-blue-500' 
                                                    : paymentProgress >= 50 
                                                    ? 'bg-amber-500' 
                                                    : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block text-center">
                                        {Math.round(paymentProgress)}%
                                    </span>
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
                                <td className="p-4 space-x-4 space-x-reverse">
                                    <button onClick={() => handleOpenDocManager(booking)} className="text-teal-600 hover:underline font-semibold">المرفقات</button>
                                    {/* زر طباعة العقد */}
                                    {(() => {
                                        const customer = customers.find(c => c.id === booking.customerId);
                                        if (customer && unit) {
                                            const bookingInfo: BookingInfo = {
                                                id: booking.id,
                                                date: booking.bookingDate,
                                                customer: {
                                                    id: customer.id,
                                                    name: customer.name,
                                                    phone: customer.phone,
                                                    email: customer.email,
                                                    nationalId: customer.nationalId,
                                                    address: customer.address
                                                },
                                                unit: {
                                                    id: unit.id,
                                                    name: unit.name,
                                                    type: unit.type,
                                                    area: unit.area,
                                                    price: unit.price,
                                                    projectName: activeProject?.name || 'المشروع',
                                                    building: unit.building,
                                                    floor: unit.floor
                                                },
                                                totalPrice: unitPrice,
                                                downPayment: totalPaid,
                                                remainingAmount: remainingAmount,
                                                paymentMethod: booking.paymentMethod || 'نقدي',
                                                installmentsCount: booking.installmentsCount,
                                                notes: booking.notes,
                                                scheduledPayments: scheduledPaymentsByBooking.get(booking.id) || []
                                            };
                                            return (
                                                <PrintContractButton 
                                                    booking={bookingInfo} 
                                                    variant="menu-item" 
                                                    className="inline-block text-indigo-600 hover:underline font-semibold"
                                                />
                                            );
                                        }
                                        return null;
                                    })()}
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
            {/* ✅ حماية المودال بفحص الصلاحيات */}
            {isModalOpen && ((editingBooking === null && canAdd) || (editingBooking !== null && canEdit)) && <BookingPanel booking={editingBooking} units={units} customers={customers} accounts={accounts} onClose={handleCloseModal} onSave={handleSave} />}
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

        </div>
    );
};

interface PanelProps { booking: Booking | null; units: Unit[]; customers: Customer[]; accounts: Account[]; onClose: () => void; onSave: (data: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => Promise<Booking | undefined>; }

const BookingPanel: React.FC<PanelProps> = ({ booking, units, customers, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    
    // حساب تاريخ القسط الأول (5 أيام بعد تاريخ الحجز)
    const getDefaultStartDate = (bookingDate: string) => {
        const date = new Date(bookingDate);
        date.setDate(date.getDate() + 5); // إضافة 5 أيام
        return date.toISOString().split('T')[0];
    };
    
    const [formData, setFormData] = useState({
        unitId: booking?.unitId || '',
        customerId: booking?.customerId || '',
        bookingDate: booking?.bookingDate || new Date().toISOString().split('T')[0],
        amountPaid: booking?.amountPaid || 0,
        accountId: accounts.length > 0 ? accounts[0].id : '',
        // حقول خطة الدفع الجديدة
        enablePaymentPlan: !!booking?.paymentPlanYears,
        paymentPlanYears: booking?.paymentPlanYears || 5 as 4 | 5,
        paymentFrequencyMonths: booking?.paymentFrequencyMonths || 1 as 1 | 2 | 3 | 4 | 5,
        paymentStartDate: booking?.paymentStartDate || getDefaultStartDate(booking?.bookingDate || new Date().toISOString().split('T')[0]),
    });
    
    // حساب تفاصيل خطة الدفع (مع خصم دفعة الحجز)
    const paymentPlanDetails = useMemo(() => {
        if (!formData.enablePaymentPlan || !formData.unitId) return null;
        
        const selectedUnit = units.find(u => u.id === formData.unitId);
        if (!selectedUnit) return null;
        
        const unitPrice = selectedUnit.price;
        const bookingPayment = formData.amountPaid || 0; // دفعة الحجز
        const remainingAmount = unitPrice - bookingPayment; // المبلغ المتبقي بعد خصم دفعة الحجز
        
        const totalMonths = formData.paymentPlanYears * 12;
        const monthlyAmount = remainingAmount / totalMonths; // حساب على أساس المبلغ المتبقي
        const installmentAmount = monthlyAmount * formData.paymentFrequencyMonths;
        const totalInstallments = Math.ceil(totalMonths / formData.paymentFrequencyMonths);
        
        return {
            unitPrice,
            bookingPayment,
            remainingAmount: Math.round(remainingAmount * 100) / 100,
            totalMonths,
            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
            installmentAmount: Math.round(installmentAmount * 100) / 100,
            totalInstallments,
        };
    }, [formData.enablePaymentPlan, formData.unitId, formData.paymentPlanYears, formData.paymentFrequencyMonths, formData.amountPaid, units]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.unitId || !formData.customerId) {
            addToast('يرجى اختيار وحدة وعميل.', 'error');
            return;
        }
        
        // ✅ Validation: تحقق من صحة خطة الدفع
        if (formData.enablePaymentPlan) {
            const selectedUnit = units.find(u => u.id === formData.unitId);
            if (!selectedUnit) {
                addToast('الوحدة المحددة غير موجودة', 'error');
                return;
            }
            
            const remainingAfterBooking = selectedUnit.price - (formData.amountPaid || 0);
            
            if (remainingAfterBooking <= 0) {
                addToast('دفعة الحجز تغطي كامل السعر - لا حاجة لخطة دفع!', 'warning');
                setFormData(prev => ({ ...prev, enablePaymentPlan: false }));
                return;
            }
            
            if (paymentPlanDetails) {
                const minRequired = paymentPlanDetails.installmentAmount * 2;
                if (remainingAfterBooking < minRequired) {
                    addToast(`المبلغ المتبقي ${formatCurrency(remainingAfterBooking)} قليل جداً للتقسيط على ${formData.paymentPlanYears} سنوات. الحد الأدنى المطلوب: ${formatCurrency(minRequired)}`, 'error');
                    return;
                }
            }
        }
        
        // Prepare booking data
        const bookingData: any = {
            unitId: formData.unitId,
            customerId: formData.customerId,
            bookingDate: formData.bookingDate,
            amountPaid: formData.amountPaid,
            accountId: formData.accountId,
        };
        
        // Add payment plan data if enabled
        if (formData.enablePaymentPlan) {
            bookingData.paymentPlanYears = formData.paymentPlanYears;
            bookingData.paymentFrequencyMonths = formData.paymentFrequencyMonths;
            bookingData.paymentStartDate = formData.paymentStartDate;
        }
        
        // Save booking first
        const savedBooking = await onSave(bookingData);
        
        // Generate scheduled payments if payment plan is enabled
        if (savedBooking && formData.enablePaymentPlan && paymentPlanDetails) {
            try {
                if (paymentPlanDetails.remainingAmount <= 0) {
                    addToast('لا يمكن إنشاء خطة دفع لأن المبلغ المتبقي يساوي صفر', 'warning');
                    return;
                }

                const result = await scheduledPaymentsService.generateForBooking(
                    savedBooking.id,
                    paymentPlanDetails.remainingAmount, // المبلغ المتبقي وليس سعر الوحدة الكامل
                    formData.paymentPlanYears,
                    formData.paymentFrequencyMonths,
                    formData.paymentStartDate
                );
                
                // التحقق من أن الدفعات تم إنشاؤها
                const createdPayments = await scheduledPaymentsService.getByBookingId(savedBooking.id);
                
                if (createdPayments.length > 0) {
                    addToast(`تم إنشاء ${createdPayments.length} دفعة مجدولة بنجاح 🎉`, 'success');
                } else {
                    addToast('تم حفظ خطة الدفع لكن لم يتم إنشاء الدفعات المجدولة', 'warning');
                }
            } catch (error: any) {
                if (error?.message?.includes('row-level security')) {
                    addToast('خطأ في الصلاحيات: يرجى تطبيق سكريبت FIX-RLS-scheduled-payments.sql', 'error');
                } else {
                    addToast(`فشل إنشاء جدول الدفعات: ${error?.message || 'خطأ غير معروف'}`, 'error');
                }
            }
        }
        
        // Upload documents if any and if booking is new
        if (!booking && uploadFiles.length > 0 && savedBooking) {
            try {
                for (const file of uploadFiles) {
                    await documentsService.upload(file, { 
                        booking_id: savedBooking.id,
                        project_id: savedBooking.projectId 
                    });
                }
                addToast('تم رفع المستندات بنجاح', 'success');
            } catch (error) {
                addToast('تم حفظ الحجز لكن فشل رفع بعض المستندات', 'warning');
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'amountPaid' || name === 'paymentPlanYears' || name === 'paymentFrequencyMonths') {
            setFormData(prev => ({ ...prev, [name]: Number(value) }));
        } else if (name === 'bookingDate') {
            // عند تغيير تاريخ الحجز، تحديث تاريخ القسط الأول تلقائياً
            const newStartDate = getDefaultStartDate(value);
            setFormData(prev => ({ ...prev, [name]: value, paymentStartDate: newStartDate }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={booking ? 'تعديل حجز' : 'حجز جديد'}
            size="lg"
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
                        <AmountInput
                            value={formData.amountPaid || ''}
                            onValueChange={(amountPaid) =>
                                setFormData(prev => ({
                                    ...prev,
                                    amountPaid: amountPaid === '' ? 0 : amountPaid,
                                }))
                            }
                            className="input-field"
                            placeholder="0"
                            disabled={!!booking}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            {booking ? 'لتعديل الدفعات استخدم شاشة الدفعات.' : 'يجب أن لا يتجاوز المبلغ سعر الوحدة'}
                        </p>
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
                    
                    {/* ================================================== */}
                    {/* قسم خطة الدفع - Payment Plan Section */}
                    {/* ================================================== */}
                    {formData.unitId && (
                        <div className="border-t border-white/20 pt-4 mt-4">
                            <div className="flex items-center gap-3 mb-4">
                                <input
                                    type="checkbox"
                                    id="enablePaymentPlan"
                                    name="enablePaymentPlan"
                                    checked={formData.enablePaymentPlan}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-amber-500 focus:ring-amber-500"
                                />
                                <label htmlFor="enablePaymentPlan" className="text-white font-semibold cursor-pointer">
                                    تفعيل خطة الدفع المجدولة
                                </label>
                            </div>
                            
                            {formData.enablePaymentPlan && (
                                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-4 space-y-4">
                                    <h4 className="text-amber-400 font-bold flex items-center gap-2">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        إعداد خطة السداد
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* مدة الخطة */}
                                        <div>
                                            <label className="input-label">مدة خطة الدفع <span className="text-rose-400">*</span></label>
                                            <select
                                                name="paymentPlanYears"
                                                value={formData.paymentPlanYears}
                                                onChange={handleChange}
                                                className="input-field"
                                            >
                                                <option value={4}>4 سنوات (48 شهر)</option>
                                                <option value={5}>5 سنوات (60 شهر)</option>
                                            </select>
                                        </div>
                                        
                                        {/* تكرار الدفع */}
                                        <div>
                                            <label className="input-label">تكرار الدفعات <span className="text-rose-400">*</span></label>
                                            <select
                                                name="paymentFrequencyMonths"
                                                value={formData.paymentFrequencyMonths}
                                                onChange={handleChange}
                                                className="input-field"
                                            >
                                                <option value={1}>شهرياً (كل شهر)</option>
                                                <option value={2}>كل شهرين</option>
                                                <option value={3}>كل 3 أشهر (ربع سنوي)</option>
                                                <option value={4}>كل 4 أشهر</option>
                                                <option value={5}>كل 5 أشهر</option>
                                            </select>
                                        </div>
                                        
                                        {/* تاريخ بدء الدفعات */}
                                        <div className="md:col-span-2">
                                            <label className="input-label">تاريخ بدء أول دفعة <span className="text-rose-400">*</span></label>
                                            <input
                                                type="date"
                                                name="paymentStartDate"
                                                value={formData.paymentStartDate}
                                                onChange={handleChange}
                                                className="input-field"
                                                required={formData.enablePaymentPlan}
                                            />
                                            <p className="text-xs text-amber-300 mt-1">
                                                💡 سيبدأ القسط الأول بعد 5 أيام من تاريخ الحجز تلقائياً
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* ملخص خطة الدفع */}
                                    {paymentPlanDetails && (
                                        <div className="bg-slate-800/50 rounded-lg p-4 mt-4">
                                            <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                                                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                                ملخص خطة الدفع
                                            </h5>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                                    <p className="text-slate-400 text-xs">سعر الوحدة</p>
                                                    <p className="text-white font-bold">{formatCurrency(paymentPlanDetails.unitPrice)}</p>
                                                </div>
                                                <div className="bg-blue-500/20 rounded-lg p-3 text-center">
                                                    <p className="text-blue-300 text-xs">دفعة الحجز</p>
                                                    <p className="text-blue-400 font-bold">{formatCurrency(paymentPlanDetails.bookingPayment)}</p>
                                                </div>
                                                <div className="bg-purple-500/20 rounded-lg p-3 text-center">
                                                    <p className="text-purple-300 text-xs">المتبقي للتقسيط</p>
                                                    <p className="text-purple-400 font-bold">{formatCurrency(paymentPlanDetails.remainingAmount)}</p>
                                                </div>
                                                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                                                    <p className="text-slate-400 text-xs">عدد الأقساط</p>
                                                    <p className="text-white font-bold">{paymentPlanDetails.totalInstallments} قسط</p>
                                                </div>
                                                <div className="bg-emerald-500/20 rounded-lg p-3 text-center">
                                                    <p className="text-emerald-300 text-xs">المبلغ الشهري</p>
                                                    <p className="text-emerald-400 font-bold">{formatCurrency(paymentPlanDetails.monthlyAmount)}</p>
                                                </div>
                                                <div className="bg-amber-500/20 rounded-lg p-3 text-center">
                                                    <p className="text-amber-300 text-xs">مبلغ كل قسط</p>
                                                    <p className="text-amber-400 font-bold">{formatCurrency(paymentPlanDetails.installmentAmount)}</p>
                                                </div>
                                            </div>
                                            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-lg p-3 mt-3 border border-emerald-500/20">
                                                <p className="text-sm text-slate-300 text-center">
                                                    💰 سيتم تقسيط مبلغ <span className="text-purple-400 font-bold">{formatCurrency(paymentPlanDetails.remainingAmount)}</span> على 
                                                    <span className="text-white font-bold"> {paymentPlanDetails.totalInstallments} </span> قسط 
                                                    بقيمة <span className="text-amber-400 font-bold">{formatCurrency(paymentPlanDetails.installmentAmount)}</span> لكل قسط،
                                                    تبدأ من <span className="text-emerald-400 font-bold">{formData.paymentStartDate}</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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
