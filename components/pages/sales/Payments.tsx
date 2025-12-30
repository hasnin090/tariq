import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Payment, Customer, Booking, Unit, ScheduledPayment } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import { filterPaymentsByProject } from '../../../utils/projectFilters';
import { formatCurrency } from '../../../utils/currencyFormatter';
import logActivity from '../../../utils/activityLogger';
import { paymentsService, customersService, bookingsService, unitsService, documentsService, scheduledPaymentsService } from '../../../src/services/supabaseService';
import { CreditCardIcon, PrinterIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, UploadIcon, FileIcon, CalendarIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';
import AmountInput from '../../shared/AmountInput';
import { PrintReceiptButton } from '../../shared/PrintComponents';
import { PaymentInfo, generateReceiptNumber } from '../../../utils/printService';

// نوع لتجميع الدفعات حسب الحجز
interface BookingPaymentGroup {
    bookingId: string;
    customerName: string;
    customerId: string;
    unitName: string;
    unitId: string;
    unitPrice: number;
    totalPaid: number;
    remaining: number;
    payments: Payment[];
    lastPaymentDate: string;
    bookingStatus: string; // حالة الحجز (Active, Completed)
}

const Payments: React.FC = () => {
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [allPaymentsWithBooking, setAllPaymentsWithBooking] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
    const [showCustomerPayments, setShowCustomerPayments] = useState(false);
    const [selectedCustomerPaymentIds, setSelectedCustomerPaymentIds] = useState<Set<string>>(new Set());
    const [customerPrintOnlySelected, setCustomerPrintOnlySelected] = useState(false);
    const [customerPrintIncludePaid, setCustomerPrintIncludePaid] = useState(true);
    const [customerPrintIncludeRemainingSchedule, setCustomerPrintIncludeRemainingSchedule] = useState(true);
    const [selectedBookingIdsForPrint, setSelectedBookingIdsForPrint] = useState<Set<string>>(new Set());
    const [showAddPayment, setShowAddPayment] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);
    const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
    const [newPayment, setNewPayment] = useState({
        bookingId: '',
        amount: '' as number | '',
        paymentDate: new Date().toISOString().split('T')[0],
    });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const receiptInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    // الدفعات المجدولة لكل حجز
    const [scheduledPaymentsByBooking, setScheduledPaymentsByBooking] = useState<Map<string, ScheduledPayment[]>>(new Map());

    // تجميع الدفعات حسب الحجز
    const groupedPayments = useMemo(() => {
        const groups = new Map<string, BookingPaymentGroup>();
        
        allPaymentsWithBooking.forEach(payment => {
            if (!groups.has(payment.bookingId)) {
                // البحث عن حالة الحجز
                const booking = bookings.find(b => b.id === payment.bookingId);
                groups.set(payment.bookingId, {
                    bookingId: payment.bookingId,
                    customerName: payment.customerName || '',
                    customerId: payment.customerId,
                    unitName: payment.unitName || '',
                    unitId: payment.unitId,
                    unitPrice: payment.unitPrice || 0,
                    totalPaid: 0,
                    remaining: 0,
                    payments: [],
                    lastPaymentDate: payment.paymentDate,
                    bookingStatus: booking?.status || 'Active',
                });
            }
            
            const group = groups.get(payment.bookingId)!;
            group.payments.push(payment);
            group.totalPaid += payment.amount;
            
            // تحديث آخر تاريخ دفعة
            if (new Date(payment.paymentDate) > new Date(group.lastPaymentDate)) {
                group.lastPaymentDate = payment.paymentDate;
            }
        });
        
        // حساب المتبقي وترتيب الدفعات داخل كل مجموعة
        groups.forEach(group => {
            group.remaining = group.unitPrice - group.totalPaid;
            group.payments.sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        });
        
        return Array.from(groups.values());
    }, [allPaymentsWithBooking, bookings]);

    // تصفية المجموعات حسب المشروع والبحث
    const filteredGroups = useMemo(() => {
        let filtered = groupedPayments;
        
        // Filter by project
        if (activeProject) {
            filtered = filtered.filter(group => {
                const unit = units.find(u => u.id === group.unitId);
                return unit?.projectId === activeProject.id;
            });
        }
        
        // Filter by search term
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(group =>
                group.customerName?.toLowerCase().includes(search) ||
                group.unitName?.toLowerCase().includes(search)
            );
        }
        
        // ترتيب حسب آخر تاريخ دفعة
        return filtered.sort((a, b) => new Date(b.lastPaymentDate).getTime() - new Date(a.lastPaymentDate).getTime());
    }, [groupedPayments, units, activeProject, searchTerm]);

    // Toggle expand/collapse
    const toggleBookingExpand = (bookingId: string) => {
        setExpandedBookings(prev => {
            const newSet = new Set(prev);
            if (newSet.has(bookingId)) {
                newSet.delete(bookingId);
            } else {
                newSet.add(bookingId);
            }
            return newSet;
        });
    };

    // Filter all combined payments (regular + booking payments) by active project and search term
    const filteredAllPayments = useMemo(() => {
        let filtered = allPaymentsWithBooking;
        
        // Filter by project
        if (activeProject) {
            filtered = filtered.filter(payment => {
                const unit = units.find(u => u.id === payment.unitId);
                return unit?.projectId === activeProject.id;
            });
        }
        
        // Filter by search term (customer name or unit name)
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(payment => 
                payment.customerName?.toLowerCase().includes(search) ||
                payment.unitName?.toLowerCase().includes(search)
            );
        }
        
        return filtered;
    }, [allPaymentsWithBooking, units, activeProject, searchTerm]);

    useEffect(() => {
        loadAllData();
        
        const paymentsSubscription = paymentsService.subscribe((data) => {
            const sortedPayments = data.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            setPayments(sortedPayments);
            mergePaymentsWithBookings(sortedPayments, bookings, units);
        });

        const bookingsSubscription = bookingsService.subscribe((data) => {
            // عرض الحجوزات النشطة والمكتملة (لا نستبعد المكتملة من قائمة الدفعات)
            const relevantBookings = data.filter(b => b.status === 'Active' || b.status === 'Completed');
            setBookings(relevantBookings);
            mergePaymentsWithBookings(payments, relevantBookings, units);
        });

        return () => {
            paymentsSubscription?.unsubscribe();
            bookingsSubscription?.unsubscribe();
        };
    }, []);

    const loadAllData = async () => {
        try {
            setLoading(true);
            const [paymentsData, customersData, bookingsData, unitsData] = await Promise.all([
                paymentsService.getAll(),
                customersService.getAll(),
                bookingsService.getAll(),
                unitsService.getAll()
            ]);
            
            const sortedPayments = paymentsData.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
            // عرض الحجوزات النشطة والمكتملة
            const relevantBookings = bookingsData.filter(b => b.status === 'Active' || b.status === 'Completed');
            
            setPayments(sortedPayments);
            setCustomers(customersData);
            setBookings(relevantBookings);
            setUnits(unitsData);
            
            // Now merge after all data is loaded
            mergePaymentsWithBookings(sortedPayments, relevantBookings, unitsData);
            
            // تحميل الدفعات المجدولة لجميع الحجوزات
            await loadScheduledPayments(relevantBookings);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    // تحميل الدفعات المجدولة لجميع الحجوزات
    const loadScheduledPayments = async (bookingsData: Booking[]) => {
        try {
            const scheduledMap = new Map<string, ScheduledPayment[]>();

            const bookingIds = bookingsData.map(b => b.id);
            const allScheduled = await scheduledPaymentsService.getByBookingIds(bookingIds);

            // Group by booking
            for (const sp of allScheduled) {
                if (!scheduledMap.has(sp.bookingId)) scheduledMap.set(sp.bookingId, []);
                scheduledMap.get(sp.bookingId)!.push(sp);
            }

            // Ensure stable ordering
            for (const [bookingId, list] of scheduledMap.entries()) {
                list.sort((a, b) => a.installmentNumber - b.installmentNumber);
            }

            setScheduledPaymentsByBooking(scheduledMap);
        } catch (error) {
            // تجاهل الأخطاء (مثل عدم وجود الجدول) حتى لا تعطل صفحة الدفعات
            setScheduledPaymentsByBooking(new Map());
        }
    };

    const mergePaymentsWithBookings = (paymentsData: Payment[], bookingsData: Booking[], unitsData: Unit[]) => {
        // Group payments by booking to calculate totals
        const paymentsByBooking = new Map<string, Payment[]>();
        
        paymentsData.forEach(payment => {
            if (!paymentsByBooking.has(payment.bookingId)) {
                paymentsByBooking.set(payment.bookingId, []);
            }
            paymentsByBooking.get(payment.bookingId)!.push(payment);
        });
        
        const combined: Payment[] = [];
        
        // Process each booking
        bookingsData.forEach(booking => {
            const unit = unitsData.find(u => u.id === booking.unitId);
            const unitPrice = unit?.price || 0;
            
            // Get all payments for this booking from the payments table
            const bookingPayments = paymentsByBooking.get(booking.id) || [];
            
            // Calculate cumulative paid amounts
            let cumulativePaid = 0;
            
            // Add all payments with cumulative remaining amount
            bookingPayments
                .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime())
                .forEach(payment => {
                    cumulativePaid += payment.amount;
                    combined.push({
                        ...payment,
                        customerName: payment.customerName || booking.customerName,
                        unitName: payment.unitName || booking.unitName,
                        unitId: payment.unitId || booking.unitId,
                        unitPrice: unitPrice,
                        remainingAmount: unitPrice - cumulativePaid // Cumulative remaining
                    });
                });
        });
        
        // Sort by date (newest first)
        combined.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        
        setAllPaymentsWithBooking(combined);
    };



    const handleDeletePayment = async (payment: Payment) => {
        if (currentUser?.role !== 'Admin') {
            addToast('هذه العملية متاحة للمدير فقط', 'error');
            return;
        }
        
        // Check if this is a booking payment (cannot be deleted)
        if (payment.paymentType === 'booking') {
            // ✅ تحقق إضافي: هل هناك خطة دفع نشطة؟
            const booking = bookings.find(b => b.id === payment.bookingId);
            if (booking) {
                try {
                    const scheduledPayments = await scheduledPaymentsService.getByBookingId(booking.id);
                    const hasActiveSchedule = scheduledPayments && scheduledPayments.length > 0;
                    if (hasActiveSchedule) {
                        addToast('لا يمكن حذف دفعة الحجز لأن هناك خطة دفع مجدولة نشطة. يجب حذف الحجز بالكامل.', 'error');
                        return;
                    }
                } catch (err) {
                    // Silently ignore check errors
                }
            }
            addToast('لا يمكن حذف دفعة الحجز. يجب حذف الحجز بالكامل.', 'error');
            return;
        }
        
        setPaymentToDelete(payment);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;
        
        // Double check it's not a booking payment
        if (paymentToDelete.paymentType === 'booking') {
            addToast('لا يمكن حذف دفعة الحجز', 'error');
            setPaymentToDelete(null);
            return;
        }

        try {
            // احفظ معلومات الحجز قبل الحذف
            const bookingId = paymentToDelete.bookingId;
            const booking = bookings.find(b => b.id === bookingId);
            const unit = units.find(u => u.id === paymentToDelete.unitId);
            
            // حساب المبلغ المدفوع الحالي قبل الحذف
            const currentTotalPaid = payments
                .filter(p => p.bookingId === bookingId)
                .reduce((sum, p) => sum + p.amount, 0);
            
            // المبلغ بعد الحذف
            const newTotalPaid = currentTotalPaid - paymentToDelete.amount;
            
            // ✅ فك ربط الدفعة من الدفعة المجدولة (إرجاعها لحالة pending)
            await scheduledPaymentsService.unlinkPayment(paymentToDelete.id);
            
            await paymentsService.delete(paymentToDelete.id);
            logActivity('Delete Payment', `Deleted additional payment of ${formatCurrency(paymentToDelete.amount)} for ${paymentToDelete.customerName}`, 'projects');
            
            // ✅ تحديث حالة الحجز إذا كان مكتملاً وأصبح المبلغ غير مكتمل
            if (booking && unit && booking.status === 'Completed' && newTotalPaid < unit.price) {
                // إرجاع حالة الحجز إلى نشط
                await bookingsService.update(bookingId, { status: 'Active' } as any);
                addToast(`تم حذف الدفعة وتحديث حالة الحجز إلى "نشط" - المتبقي: ${formatCurrency(unit.price - newTotalPaid)}`, 'warning');
                logActivity('Booking Status Changed', `Booking ${bookingId} status changed from Completed to Active after payment deletion`, 'projects');
            } else {
                addToast(`تم حذف الدفعة الإضافية بمبلغ ${formatCurrency(paymentToDelete.amount)} بنجاح`, 'success');
            }
            
            setPaymentToDelete(null);
            await loadAllData();
        } catch (error) {
            console.error('Error deleting payment:', error);
            addToast('خطأ في حذف الدفعة', 'error');
        }
    };

    const handleSavePayment = async () => {
        try {
            if (!newPayment.bookingId || newPayment.amount <= 0) {
                addToast('الرجاء ملء جميع الحقول بشكل صحيح', 'error');
                return;
            }

            const booking = bookings.find(b => b.id === newPayment.bookingId);
            if (!booking) {
                addToast('الحجز غير موجود', 'error');
                return;
            }

            // Get unit to get the actual price
            const unit = units.find(u => u.id === booking.unitId);
            if (!unit) {
                addToast('الوحدة غير موجودة', 'error');
                return;
            }

            // ✅ CRITICAL: Calculate total paid from payments table only
            // Note: booking.amountPaid is auto-updated by database trigger from payments table
            // So we only need to sum payments, NOT add booking.amountPaid (that would double count)
            const currentTotalPaid = payments.filter(p => p.bookingId === booking.id).reduce((sum, p) => sum + p.amount, 0);
            const newTotalPaid = currentTotalPaid + newPayment.amount;
            const remaining = unit.price - currentTotalPaid;

            // Validate: New payment should not exceed remaining amount
            if (newPayment.amount > remaining) {
                addToast(
                    `المبلغ المدخل ${formatCurrency(newPayment.amount)} يتجاوز المبلغ المتبقي ${formatCurrency(remaining)}. السعر الكلي: ${formatCurrency(unit.price)}، المدفوع: ${formatCurrency(currentTotalPaid)}`,
                    'error'
                );
                return;
            }

            // Validate: Total should not exceed unit price
            if (newTotalPaid > unit.price) {
                addToast(
                    `إجمالي المدفوعات ${formatCurrency(newTotalPaid)} يتجاوز سعر الوحدة ${formatCurrency(unit.price)}`,
                    'error'
                );
                return;
            }

            const payment: Omit<Payment, 'id' | 'remainingAmount'> = {
                bookingId: booking.id,
                customerId: booking.customerId,
                customerName: booking.customerName,
                unitId: booking.unitId,
                unitName: booking.unitName,
                amount: newPayment.amount,
                paymentDate: newPayment.paymentDate,
                paymentType: newTotalPaid >= unit.price ? 'final' : 'installment', // ✅ دفعة نهائية إذا اكتمل السداد
                unitPrice: unit.price,
                accountId: 'account_default_cash',
            };

            setIsUploading(true);
            const savedPayment = await paymentsService.create(payment);
            
            // رفع إيصال الدفع إذا تم اختياره
            if (receiptFile && savedPayment?.id) {
                try {
                    await documentsService.upload(receiptFile, { booking_id: booking.id });
                    addToast('تم رفع إيصال الدفع بنجاح', 'success');
                } catch (uploadError) {
                    console.error('Error uploading receipt:', uploadError);
                    addToast('تم إضافة الدفعة لكن فشل رفع الإيصال', 'warning');
                }
            }
            setIsUploading(false);
            
            // ✅ تحديث حالة الحجز والوحدة إذا اكتملت الدفعات
            if (newTotalPaid >= unit.price) {
                // تحديث حالة الحجز إلى مكتمل - هذا سيفعّل الـ trigger لتحديث حالة الوحدة إلى Sold
                await bookingsService.update(booking.id, { status: 'Completed' } as any);
                
                // ✅ تسجيل عملية البيع في سجل المبيعات (unitSales)
                const customer = customers.find(c => c.id === booking.customerId);
                const unitSales = JSON.parse(localStorage.getItem('unitSales') || '[]');
                const saleRecord = {
                    id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    unitId: unit.id,
                    unitName: unit.name,
                    customerId: booking.customerId,
                    customerName: customer?.name || 'غير معروف',
                    salePrice: unit.price,
                    finalSalePrice: newTotalPaid,
                    saleDate: new Date().toISOString().split('T')[0],
                    accountId: '',
                    notes: `بيع تلقائي من الحجز #${booking.id}`,
                    bookingId: booking.id
                };
                unitSales.push(saleRecord);
                localStorage.setItem('unitSales', JSON.stringify(unitSales));
                
                addToast('تم إضافة الدفعة واكتمال سداد الوحدة بنجاح 🎉', 'success');
                logActivity('Payment Complete', `Booking ${booking.id} completed - Unit ${unit.name} marked as Sold`, 'projects');
            } else {
                addToast('تم إضافة الدفعة بنجاح', 'success');
            }
            
            setShowAddPayment(false);
            setNewPayment({
                bookingId: '',
                amount: '' as number | '',
                paymentDate: new Date().toISOString().split('T')[0],
            });
            setReceiptFile(null);
            if (receiptInputRef.current) {
                receiptInputRef.current.value = '';
            }
            await loadAllData();
        } catch (error) {
            console.error('Error saving payment:', error);
            addToast('خطأ في حفظ الدفعة', 'error');
            setIsUploading(false);
        }
    };

    const handleViewCustomerPayments = async (customerId: string) => {
        try {
            const data = await paymentsService.getByCustomerId(customerId);
            setCustomerPayments(data);
            setSelectedCustomer(customerId);
            setShowCustomerPayments(true);
            setSelectedCustomerPaymentIds(new Set());
            setCustomerPrintOnlySelected(false);
            setCustomerPrintIncludePaid(true);
            setCustomerPrintIncludeRemainingSchedule(true);
        } catch (error) {
            console.error('Error loading customer payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        }
    };

    const handlePrint = () => {
        const currencyCode = (localStorage.getItem('systemCurrency') || 'IQD').toUpperCase();
        const decimalPlaces = Number.parseInt(localStorage.getItem('systemDecimalPlaces') || '2', 10);
        const safeDecimalPlaces = Number.isFinite(decimalPlaces) ? Math.max(0, Math.min(6, decimalPlaces)) : 2;

        const formatForPrint = (value: number): string => {
            try {
                return new Intl.NumberFormat('ar-SA', {
                    style: 'currency',
                    currency: /^[A-Z]{3}$/.test(currencyCode) ? currencyCode : 'IQD',
                    minimumFractionDigits: safeDecimalPlaces,
                    maximumFractionDigits: safeDecimalPlaces,
                }).format(value);
            } catch {
                return `${value}`;
            }
        };

        const escapeHtml = (value: unknown): string => {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        };

        const accentName = (localStorage.getItem('accentColor') || 'emerald').toLowerCase();
        const accentPaletteByName: Record<string, { accent600: string; accent700: string; accent50: string; accent100: string }> = {
            emerald: { accent600: '#059669', accent700: '#047857', accent50: '#ecfdf5', accent100: '#d1fae5' },
            teal: { accent600: '#0d9488', accent700: '#0f766e', accent50: '#f0fdfa', accent100: '#ccfbf1' },
            cyan: { accent600: '#0891b2', accent700: '#0e7490', accent50: '#ecfeff', accent100: '#cffafe' },
            blue: { accent600: '#2563eb', accent700: '#1d4ed8', accent50: '#eff6ff', accent100: '#dbeafe' },
            indigo: { accent600: '#4f46e5', accent700: '#4338ca', accent50: '#eef2ff', accent100: '#e0e7ff' },
            purple: { accent600: '#7c3aed', accent700: '#6d28d9', accent50: '#faf5ff', accent100: '#f3e8ff' },
            rose: { accent600: '#e11d48', accent700: '#be123c', accent50: '#fff1f2', accent100: '#ffe4e6' },
            amber: { accent600: '#d97706', accent700: '#b45309', accent50: '#fffbeb', accent100: '#fef3c7' },
        };
        const accent = accentPaletteByName[accentName] || accentPaletteByName.emerald;

        const baseStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            :root { --accent-600: ${accent.accent600}; --accent-700: ${accent.accent700}; --accent-50: ${accent.accent50}; --accent-100: ${accent.accent100}; }
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; direction: rtl; color: #0f172a; background: #ffffff; }
            .sheet { border: 2px solid var(--accent-700); border-radius: 10px; padding: 14px; }
            .header { padding-bottom: 10px; border-bottom: 2px solid var(--accent-700); margin-bottom: 14px; }
            .brandbar { height: 8px; background: var(--accent-700); border-radius: 999px; margin-bottom: 10px; }
            .title { font-size: 18px; font-weight: 800; color: var(--accent-700); margin-bottom: 6px; }
            .subtitle { font-size: 12px; color: #475569; margin-top: 2px; }
            .meta { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 12px; color: #334155; margin-top: 8px; }
            .meta b { color: #0f172a; }
            .section { margin-top: 12px; break-inside: avoid; }
            .section-title { font-size: 13px; font-weight: 800; color: #0f172a; background: var(--accent-50); border: 1px solid var(--accent-100); padding: 8px 10px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #cbd5e1; }
            thead { display: table-header-group; }
            th { background: var(--accent-700); color: #fff; padding: 9px 8px; text-align: right; font-size: 12px; border: 1px solid var(--accent-700); }
            td { padding: 9px 8px; text-align: right; font-size: 12px; border: 1px solid #cbd5e1; color: #0f172a; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .summary { margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px; }
            .summary .card { border: 1px solid var(--accent-100); background: var(--accent-50); border-radius: 10px; padding: 10px; }
            .summary .card b { color: var(--accent-700); }
            .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; border: 1px solid #cbd5e1; background: #f8fafc; }
            .badge.paid { border-color: #bbf7d0; background: #ecfdf5; color: #065f46; }
            .badge.pending { border-color: #cbd5e1; background: #f8fafc; color: #334155; }
            .badge.overdue { border-color: #fecaca; background: #fff1f2; color: #9f1239; }
            .badge.partial { border-color: #fde68a; background: #fffbeb; color: #92400e; }
            .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #475569; text-align: center; }
            .nowrap { white-space: nowrap; }
            @media print {
                a { color: inherit; text-decoration: none; }
            }
        `;

        const printWindow = window.open('', '', 'height=800,width=1100');
        if (!printWindow) return;

        // 1) Customer statement
        if (showCustomerPayments && selectedCustomer) {
            const customer = customers.find(c => c.id === selectedCustomer);
            const selectedIds = selectedCustomerPaymentIds;

            const companyName = 'شركة طريق العامرة';
            const projectLabel = 'مشروع مجمع الحميدية السكني';

            const unitById = new Map(units.map(u => [u.id, u]));

            // Paid payments selection

            const paidPaymentsBase = customerPrintOnlySelected && selectedIds.size
                ? customerPayments.filter(p => selectedIds.has(p.id))
                : customerPayments;

            // Prefer bookings list (has bookingDate + amountPaid); fallback to deriving booking-like rows from payments
            type BookingLike = Pick<Booking, 'id' | 'unitId' | 'unitName' | 'customerId' | 'customerName' | 'bookingDate' | 'amountPaid' | 'status'>;
            const bookingsFromState = bookings.filter(b => b.customerId === selectedCustomer);
            const bookingsForCustomer: BookingLike[] = bookingsFromState.length
                ? bookingsFromState
                : (() => {
                    const byBooking = new Map<string, Payment[]>();
                    for (const p of paidPaymentsBase) {
                        if (!byBooking.has(p.bookingId)) byBooking.set(p.bookingId, []);
                        byBooking.get(p.bookingId)!.push(p);
                    }
                    return Array.from(byBooking.entries()).map(([bookingId, list]) => {
                        const sorted = list.slice().sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
                        const first = sorted[0];
                        return {
                            id: bookingId,
                            unitId: first?.unitId || '',
                            unitName: first?.unitName || '—',
                            customerId: first?.customerId || selectedCustomer,
                            customerName: first?.customerName || customer?.name || '',
                            bookingDate: first?.paymentDate || new Date().toISOString().split('T')[0],
                            amountPaid: 0,
                            status: 'Active',
                        };
                    });
                })();

            // Ensure booking initial payment is represented (it exists on bookings.amountPaid and might not exist in payments table)
            const paidPaymentsWithInitial: Array<Payment & { _virtual?: boolean; _label?: string }> = paidPaymentsBase.slice();
            for (const booking of bookingsForCustomer) {
                const hasBookingPaymentRow = paidPaymentsWithInitial.some(p => p.bookingId === booking.id && p.paymentType === 'booking');
                if (!hasBookingPaymentRow && (booking.amountPaid || 0) > 0) {
                    const unitPriceFromUnit = booking.unitId ? (unitById.get(booking.unitId)?.price || 0) : 0;
                    paidPaymentsWithInitial.push({
                        id: `virtual_booking_payment_${booking.id}`,
                        bookingId: booking.id,
                        amount: booking.amountPaid,
                        paymentDate: booking.bookingDate,
                        paymentType: 'booking',
                        customerId: booking.customerId,
                        customerName: booking.customerName,
                        unitId: booking.unitId,
                        unitName: booking.unitName,
                        unitPrice: unitPriceFromUnit,
                        remainingAmount: undefined,
                        _virtual: true,
                        _label: 'دفعة الحجز',
                    });
                }
            }

            const paidPaymentsToPrint = paidPaymentsWithInitial
                .slice()
                .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

            // Group by booking for a complete statement per unit
            const paymentsByBooking = new Map<string, Array<Payment & { _virtual?: boolean; _label?: string }>>();
            for (const p of paidPaymentsToPrint) {
                if (!paymentsByBooking.has(p.bookingId)) paymentsByBooking.set(p.bookingId, []);
                paymentsByBooking.get(p.bookingId)!.push(p);
            }

            const scheduleStatusLabel = (s: ScheduledPayment['status']) => {
                if (s === 'paid') return { text: 'مدفوعة', cls: 'paid' };
                if (s === 'overdue') return { text: 'متأخرة', cls: 'overdue' };
                if (s === 'partially_paid') return { text: 'مدفوعة جزئياً', cls: 'partial' };
                return { text: 'مجدولة', cls: 'pending' };
            };

            const bookingSections = bookingsForCustomer
                .slice()
                .sort((a, b) => a.unitName.localeCompare(b.unitName))
                .map(booking => {
                    const unit = unitById.get(booking.unitId);
                    const paidForThisBooking = (paymentsByBooking.get(booking.id) || []);
                    const unitPrice = unit?.price || paidForThisBooking.find(p => typeof p.unitPrice === 'number')?.unitPrice || 0;
                    const paidSum = paidForThisBooking.reduce((sum, p) => sum + (p.amount || 0), 0);
                    const remaining = Math.max(0, unitPrice - paidSum);

                    const paidRows = paidForThisBooking
                        .map(p => `
                            <tr>
                                <td class="nowrap">${escapeHtml(p.paymentDate)}</td>
                                <td>${escapeHtml((p as any)._label || (p.paymentType === 'booking' ? 'دفعة الحجز' : 'دفعة'))}</td>
                                <td class="nowrap">${formatForPrint(p.amount)}</td>
                                <td>${escapeHtml(p.notes || '—')}</td>
                            </tr>
                        `)
                        .join('');

                    const scheduledAll = scheduledPaymentsByBooking.get(booking.id) || [];
                    const scheduledRemaining = scheduledAll
                        .filter(sp => sp.status !== 'paid')
                        .slice()
                        .sort((a, b) => a.installmentNumber - b.installmentNumber);
                    const scheduledRemainingSum = scheduledRemaining.reduce((sum, sp) => sum + (sp.amount || 0) - (sp.paidAmount || 0), 0);

                    const scheduledRows = scheduledRemaining
                        .map(sp => {
                            const lbl = scheduleStatusLabel(sp.status);
                            const remainingOnInstallment = Math.max(0, (sp.amount || 0) - (sp.paidAmount || 0));
                            return `
                                <tr>
                                    <td class="nowrap">${escapeHtml(sp.installmentNumber)}</td>
                                    <td class="nowrap">${escapeHtml(new Date(sp.dueDate).toLocaleDateString('ar-SA'))}</td>
                                    <td class="nowrap">${formatForPrint(sp.amount || 0)}</td>
                                    <td class="nowrap">${formatForPrint(sp.paidAmount || 0)}</td>
                                    <td class="nowrap">${formatForPrint(remainingOnInstallment)}</td>
                                    <td><span class="badge ${lbl.cls}">${escapeHtml(lbl.text)}</span></td>
                                </tr>
                            `;
                        })
                        .join('');

                    return `
                        <div class="section">
                            <div class="section-title">الوحدة: ${escapeHtml(booking.unitName)} <span class="subtitle">(الحجز: ${escapeHtml(booking.id)})</span></div>
                            <div class="summary">
                                <div class="card"><b>سعر الوحدة:</b> ${formatForPrint(unitPrice)}</div>
                                <div class="card"><b>إجمالي المدفوع:</b> ${formatForPrint(paidSum)}</div>
                                <div class="card"><b>المتبقي:</b> ${formatForPrint(remaining)}</div>
                                <div class="card"><b>المتبقي (دفعات مجدولة):</b> ${formatForPrint(Math.max(0, scheduledRemainingSum))}</div>
                            </div>

                            ${customerPrintIncludePaid ? `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>التاريخ</th>
                                            <th>النوع</th>
                                            <th>المبلغ</th>
                                            <th>ملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${paidRows || '<tr><td colspan="4">لا توجد دفعات مدفوعة للطباعة</td></tr>'}
                                    </tbody>
                                </table>
                            ` : ''}

                            ${customerPrintIncludeRemainingSchedule ? `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>رقم الدفعة</th>
                                            <th>تاريخ الاستحقاق</th>
                                            <th>قيمة الدفعة</th>
                                            <th>المدفوع</th>
                                            <th>المتبقي</th>
                                            <th>الحالة</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${scheduledRows || (scheduledAll.length === 0
                                            ? '<tr><td colspan="6">لا توجد دفعات متبقية مجدولة (أو لم يتم تحميل جدول الدفعات المجدولة)</td></tr>'
                                            : '<tr><td colspan="6">لا توجد دفعات متبقية مجدولة</td></tr>')}
                                    </tbody>
                                </table>
                            ` : ''}
                        </div>
                    `;
                })
                .join('');

            const totalUnitsPrice = bookingsForCustomer.reduce((sum, b) => {
                const list = paymentsByBooking.get(b.id) || [];
                const unitPrice = (b.unitId ? (unitById.get(b.unitId)?.price || 0) : 0) || list.find(p => typeof p.unitPrice === 'number')?.unitPrice || 0;
                return sum + unitPrice;
            }, 0);
            const totalPaidAll = bookingsForCustomer.reduce((sum, b) => {
                const list = paymentsByBooking.get(b.id) || [];
                return sum + list.reduce((s, p) => s + (p.amount || 0), 0);
            }, 0);
            const totalRemainingAll = Math.max(0, totalUnitsPrice - totalPaidAll);
            const allRemainingScheduled = bookingsForCustomer.reduce((sum, b) => {
                const list = scheduledPaymentsByBooking.get(b.id) || [];
                return sum + list.filter(sp => sp.status !== 'paid').reduce((s, sp) => s + (sp.amount || 0) - (sp.paidAmount || 0), 0);
            }, 0);

            const html = `
                <!DOCTYPE html>
                <html dir="rtl">
                <head>
                    <meta charset="UTF-8" />
                    <title>كشف حساب العميل</title>
                    <style>${baseStyles}</style>
                </head>
                <body>
                    <div class="sheet">
                        <div class="brandbar"></div>
                        <div class="header">
                            <div class="title">كشف حساب العميل</div>
                            <div class="meta">
                                <div><b>الشركة:</b> ${escapeHtml(companyName)}</div>
                                <div><b>المشروع:</b> ${escapeHtml(projectLabel)}</div>
                                <div><b>العميل:</b> ${escapeHtml(customer?.name || 'غير محدد')}</div>
                                <div><b>الهاتف:</b> <span dir="ltr">${escapeHtml(customer?.phone || 'غير محدد')}</span></div>
                                <div><b>البريد:</b> ${escapeHtml(customer?.email || 'غير محدد')}</div>
                                <div><b>تاريخ الطباعة:</b> ${escapeHtml(new Date().toLocaleString('ar-SA'))}</div>
                            </div>
                        </div>

                        <div class="summary">
                            <div class="card"><b>إجمالي سعر الوحدات:</b> ${formatForPrint(totalUnitsPrice)}</div>
                            <div class="card"><b>إجمالي المدفوع:</b> ${formatForPrint(totalPaidAll)}</div>
                            <div class="card"><b>إجمالي المتبقي:</b> ${formatForPrint(totalRemainingAll)}</div>
                            <div class="card"><b>إجمالي المتبقي (دفعات مجدولة):</b> ${formatForPrint(Math.max(0, allRemainingScheduled))}</div>
                        </div>

                        ${bookingSections || '<div class="section"><div class="section-title">لا توجد بيانات للحجوزات</div></div>'}

                        <div class="footer">
                            <div>التوقيع/الختم: ____________________</div>
                            <div>تم إنشاء هذا التقرير من النظام</div>
                        </div>
                    </div>
                </body>
                </html>
            `;

            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            return;
        }

        // 2) Overall payments report (current filtered result)
        const groupsToPrint = selectedBookingIdsForPrint.size
            ? filteredGroups.filter(g => selectedBookingIdsForPrint.has(g.bookingId))
            : filteredGroups;

        const reportRows = groupsToPrint
            .map(g => `
                <tr>
                    <td>${escapeHtml(g.customerName)}</td>
                    <td>${escapeHtml(g.unitName)}</td>
                    <td class="nowrap">${escapeHtml(new Date(g.lastPaymentDate).toLocaleDateString('ar-SA'))}</td>
                    <td class="nowrap">${formatForPrint(g.totalPaid)}</td>
                    <td class="nowrap">${formatForPrint(g.remaining)}</td>
                    <td>${escapeHtml(g.bookingStatus)}</td>
                </tr>
            `)
            .join('');

        const totalPaidAll = groupsToPrint.reduce((sum, g) => sum + (g.totalPaid || 0), 0);
        const totalRemainingAll = groupsToPrint.reduce((sum, g) => sum + (g.remaining || 0), 0);
        const projectName = activeProject?.name ? String(activeProject.name) : 'كل المشاريع';
        const searchInfo = searchTerm?.trim() ? searchTerm.trim() : '—';

        const html = `
            <!DOCTYPE html>
            <html dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>تقرير الدفعات</title>
                <style>${baseStyles}</style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <div class="title">تقرير الدفعات</div>
                        <div class="meta">
                            <div><b>المشروع:</b> ${escapeHtml(projectName)}</div>
                            <div><b>البحث:</b> ${escapeHtml(searchInfo)}</div>
                            <div><b>عدد السجلات:</b> ${groupsToPrint.length}</div>
                            <div><b>تاريخ الطباعة:</b> ${escapeHtml(new Date().toLocaleString('ar-SA'))}</div>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>العميل</th>
                                <th>الوحدة</th>
                                <th>آخر دفعة</th>
                                <th>إجمالي المدفوع</th>
                                <th>المتبقي</th>
                                <th>حالة الحجز</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportRows || '<tr><td colspan="6">لا توجد بيانات للطباعة</td></tr>'}
                        </tbody>
                    </table>

                    <div class="summary">
                        <div class="box"><b>إجمالي المدفوع:</b> ${formatForPrint(totalPaidAll)}</div>
                        <div class="box"><b>إجمالي المتبقي:</b> ${formatForPrint(totalRemainingAll)}</div>
                    </div>

                    <div class="footer">تم إنشاء هذا التقرير من النظام</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="container mx-auto">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل الدفعات</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button onClick={() => setShowAddPayment(true)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2">
                        <PlusIcon className="h-5 w-5" />
                        إضافة دفعة
                    </button>
                    <button onClick={handlePrint} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2">
                        <PrinterIcon className="h-5 w-5" />
                        طباعة
                    </button>
                </div>
            </div>
            
            <ProjectSelector 
                projects={availableProjects} 
                activeProject={activeProject} 
                onSelectProject={setActiveProject} 
            />

            {/* Search Box */}
            <div className="mb-6 glass-card p-6">
                <label className="block">
                    <span className="text-slate-200 font-medium mb-2 block">البحث</span>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="ابحث باسم العميل أو رقم الوحدة..."
                        className="input-field"
                    />
                </label>
            </div>

            {/* Add Payment Modal */}
            {showAddPayment && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 pt-20">
                    <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h3 className="text-2xl font-bold mb-6 text-white">إضافة دفعة جديدة</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-slate-200 font-medium mb-2">
                                        الحجز
                                    </label>
                                    <select
                                        value={newPayment.bookingId}
                                        onChange={(e) => setNewPayment({ ...newPayment, bookingId: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="">اختر حجز</option>
                                        {bookings.map(b => {
                                            const unit = units.find(u => u.id === b.unitId);
                                            const unitPrice = unit?.price || 0;
                                            // استخدام فقط مجموع payments من قاعدة البيانات (booking.amountPaid يتم تحديثه تلقائياً من trigger)
                                            const totalPaid = payments.filter(p => p.bookingId === b.id).reduce((sum, p) => sum + p.amount, 0);
                                            const remaining = unitPrice - totalPaid;
                                            
                                            return (
                                                <option key={b.id} value={b.id}>
                                                    {b.customerName} - {b.unitName} (السعر: {formatCurrency(unitPrice)} | المتبقي: {formatCurrency(remaining)})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* Display remaining amount info */}
                                {newPayment.bookingId && (() => {
                                    const booking = bookings.find(b => b.id === newPayment.bookingId);
                                    if (!booking) return null;
                                    
                                    const unit = units.find(u => u.id === booking.unitId);
                                    const unitPrice = unit?.price || 0;
                                    // استخدام فقط مجموع payments من قاعدة البيانات (تجنب الحساب المزدوج)
                                    const totalPaid = payments.filter(p => p.bookingId === booking.id).reduce((sum, p) => sum + p.amount, 0);
                                    const remaining = unitPrice - totalPaid;
                                    
                                    return (
                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="text-slate-400">سعر الوحدة:</span>
                                                    <p className="text-white font-bold">{formatCurrency(unitPrice)}</p>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">إجمالي المدفوع:</span>
                                                    <p className="text-emerald-400 font-bold">{formatCurrency(totalPaid)}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-400">المبلغ المتبقي:</span>
                                                    <p className="text-amber-400 font-bold text-lg">{formatCurrency(remaining)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div>
                                    <label className="block text-slate-200 font-medium mb-2">
                                        المبلغ المدفوع
                                    </label>
                                    <AmountInput
                                        value={newPayment.amount || ''}
                                        onValueChange={(amount) => setNewPayment({ ...newPayment, amount })}
                                        className="input-field"
                                        placeholder="أدخل المبلغ"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-200 font-medium mb-2">
                                        تاريخ الدفع
                                    </label>
                                    <input
                                        type="date"
                                        value={newPayment.paymentDate}
                                        onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

                                {/* حقل رفع إيصال الدفع */}
                                <div>
                                    <label className="block text-slate-200 font-medium mb-2">
                                        إيصال الدفع (اختياري)
                                    </label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="file"
                                            ref={receiptInputRef}
                                            onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                            id="receipt-upload"
                                            accept="image/*,application/pdf"
                                        />
                                        <label
                                            htmlFor="receipt-upload"
                                            className="flex-1 flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/20 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
                                        >
                                            <UploadIcon className="h-5 w-5 text-slate-400" />
                                            <span className="text-slate-300 truncate">
                                                {receiptFile ? receiptFile.name : 'اختر ملف الإيصال...'}
                                            </span>
                                        </label>
                                        {receiptFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReceiptFile(null);
                                                    if (receiptInputRef.current) {
                                                        receiptInputRef.current.value = '';
                                                    }
                                                }}
                                                className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                    {receiptFile && (
                                        <div className="mt-2 flex items-center gap-2 text-sm text-emerald-400">
                                            <FileIcon mimeType={receiptFile.type} className="h-4 w-4" />
                                            <span>{(receiptFile.size / 1024).toFixed(1)} KB</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleSavePayment}
                                    disabled={isUploading}
                                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUploading ? 'جاري الحفظ...' : 'حفظ'}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddPayment(false);
                                        setReceiptFile(null);
                                        if (receiptInputRef.current) {
                                            receiptInputRef.current.value = '';
                                        }
                                    }}
                                    className="flex-1 bg-white/10 text-slate-200 px-6 py-2.5 rounded-lg font-semibold hover:bg-white/20 transition-colors border border-white/20"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCustomerPayments && selectedCustomer ? (
                <div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                        <button
                            onClick={() => {
                                setShowCustomerPayments(false);
                                setSelectedCustomerPaymentIds(new Set());
                                setCustomerPrintOnlySelected(false);
                            }}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg border border-white/20 transition-colors"
                        >
                            العودة
                        </button>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handlePrint}
                                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
                            >
                                <PrinterIcon className="h-5 w-5" />
                                طباعة
                            </button>
                        </div>
                    </div>
                    <div className="glass-card overflow-hidden mb-6">
                        <div className="p-6">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <h3 className="text-xl font-bold text-white">دفعات العميل</h3>
                                {customerPayments.length > 0 && (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                                            <input
                                                type="checkbox"
                                                checked={customerPrintIncludePaid}
                                                onChange={(e) => setCustomerPrintIncludePaid(e.target.checked)}
                                            />
                                            طباعة الدفعات المدفوعة
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                                            <input
                                                type="checkbox"
                                                checked={customerPrintIncludeRemainingSchedule}
                                                onChange={(e) => setCustomerPrintIncludeRemainingSchedule(e.target.checked)}
                                            />
                                            طباعة الدفعات المتبقية (المجدولة)
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomerPaymentIds.size > 0 && selectedCustomerPaymentIds.size === customerPayments.length}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setSelectedCustomerPaymentIds(
                                                        checked ? new Set(customerPayments.map(p => p.id)) : new Set()
                                                    );
                                                }}
                                            />
                                            تحديد الكل
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                                            <input
                                                type="checkbox"
                                                disabled={selectedCustomerPaymentIds.size === 0}
                                                checked={customerPrintOnlySelected}
                                                onChange={(e) => setCustomerPrintOnlySelected(e.target.checked)}
                                            />
                                            طباعة المحدد فقط
                                        </label>
                                    </div>
                                )}
                            </div>
                            {customerPayments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right min-w-[700px]">
                                    <thead>
                                        <tr className="border-b-2 border-white/20 bg-white/5">
                                            <th className="p-4 font-bold text-sm text-slate-200">طباعة</th>
                                            <th className="p-4 font-bold text-sm text-slate-200">تاريخ الدفعة</th>
                                            <th className="p-4 font-bold text-sm text-slate-200">الوحدة</th>
                                            <th className="p-4 font-bold text-sm text-slate-200">سعر الوحدة</th>
                                            <th className="p-4 font-bold text-sm text-slate-200">المبلغ المدفوع</th>
                                            <th className="p-4 font-bold text-sm text-slate-200">المبلغ المتبقي</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customerPayments.map(payment => (
                                            <tr key={payment.id} className="border-b border-white/10 hover:bg-white/5">
                                                <td className="p-4 text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCustomerPaymentIds.has(payment.id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setSelectedCustomerPaymentIds(prev => {
                                                                const next = new Set(prev);
                                                                if (checked) next.add(payment.id);
                                                                else next.delete(payment.id);
                                                                return next;
                                                            });
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-4 text-slate-300">{payment.paymentDate}</td>
                                                <td className="p-4 font-medium text-slate-100">{payment.unitName}</td>
                                                <td className="p-4 font-semibold text-slate-100">{formatCurrency(payment.unitPrice)}</td>
                                                <td className="p-4 font-semibold text-emerald-400">{formatCurrency(payment.amount)}</td>
                                                <td className="p-4 font-semibold text-amber-400">{formatCurrency(payment.remainingAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </div>
                            ) : (
                                <p className="text-slate-300">لا توجد دفعات لهذا العميل</p>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {filteredGroups.length > 0 ? (
                        <div className="space-y-4">
                            {/* ملخص إحصائي */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="glass-card p-4">
                                    <div className="text-slate-400 text-sm mb-1">عدد الحجوزات النشطة</div>
                                    <div className="text-2xl font-bold text-white">{filteredGroups.length}</div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-slate-400 text-sm mb-1">إجمالي المدفوعات</div>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        {formatCurrency(filteredGroups.reduce((sum, g) => sum + g.totalPaid, 0))}
                                    </div>
                                </div>
                                <div className="glass-card p-4">
                                    <div className="text-slate-400 text-sm mb-1">إجمالي المتبقي</div>
                                    <div className="text-2xl font-bold text-amber-400">
                                        {formatCurrency(filteredGroups.reduce((sum, g) => sum + g.remaining, 0))}
                                    </div>
                                </div>
                            </div>

                            {/* جدول الحجوزات القابل للتوسيع */}
                            <div className="glass-card p-4">
                                <label className="flex items-center gap-2 text-sm text-slate-200 select-none">
                                    <input
                                        type="checkbox"
                                        checked={selectedBookingIdsForPrint.size > 0 && selectedBookingIdsForPrint.size === filteredGroups.length}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setSelectedBookingIdsForPrint(
                                                checked ? new Set(filteredGroups.map(g => g.bookingId)) : new Set()
                                            );
                                        }}
                                    />
                                    تحديد الكل للطباعة (حسب الوحدة/الحجز)
                                </label>
                                {selectedBookingIdsForPrint.size > 0 && (
                                    <div className="text-xs text-slate-400 mt-2">
                                        سيتم طباعة {selectedBookingIdsForPrint.size} من أصل {filteredGroups.length}.
                                    </div>
                                )}
                            </div>
                            {filteredGroups.map(group => {
                                const isExpanded = expandedBookings.has(group.bookingId);
                                const progressPercent = group.unitPrice > 0 ? (group.totalPaid / group.unitPrice) * 100 : 0;
                                
                                return (
                                    <div key={group.bookingId} className="glass-card overflow-hidden">
                                        {/* الصف الرئيسي - ملخص الحجز */}
                                        <div 
                                            className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                                            onClick={() => toggleBookingExpand(group.bookingId)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    {/* تحديد للطباعة */}
                                                    <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBookingIdsForPrint.has(group.bookingId)}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setSelectedBookingIdsForPrint(prev => {
                                                                    const next = new Set(prev);
                                                                    if (checked) next.add(group.bookingId);
                                                                    else next.delete(group.bookingId);
                                                                    return next;
                                                                });
                                                            }}
                                                        />
                                                    </div>

                                                    {/* أيقونة التوسيع */}
                                                    <div className="text-slate-400">
                                                        {isExpanded ? (
                                                            <ChevronUpIcon className="h-6 w-6" />
                                                        ) : (
                                                            <ChevronDownIcon className="h-6 w-6" />
                                                        )}
                                                    </div>
                                                    
                                                    {/* معلومات العميل والوحدة */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-lg font-bold text-white">{group.customerName}</h3>
                                                            <span className="text-slate-400">-</span>
                                                            <span className="text-slate-300">{group.unitName}</span>
                                                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                                                                {group.payments.length} دفعة
                                                            </span>
                                                            {group.bookingStatus === 'Completed' && (
                                                                <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                                                    <CheckCircleIcon className="h-3 w-3" />
                                                                    مكتمل
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* شريط التقدم */}
                                                        <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                                                            <div 
                                                                className={`h-2 rounded-full transition-all ${
                                                                    progressPercent >= 100 ? 'bg-emerald-500' : 
                                                                    progressPercent >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                                                                }`}
                                                                style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                                            />
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-6 text-sm">
                                                            <span className="text-slate-400">
                                                                سعر الوحدة: <span className="text-slate-200 font-semibold">{formatCurrency(group.unitPrice)}</span>
                                                            </span>
                                                            <span className="text-slate-400">
                                                                تم الدفع: <span className="text-emerald-400 font-semibold">{formatCurrency(group.totalPaid)}</span>
                                                            </span>
                                                            <span className="text-slate-400">
                                                                المتبقي: <span className="text-amber-400 font-semibold">{formatCurrency(group.remaining)}</span>
                                                            </span>
                                                            <span className="text-slate-400">
                                                                النسبة: <span className={`font-semibold ${progressPercent >= 100 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                                                    {progressPercent.toFixed(1)}%
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {/* زر إضافة دفعة - يظهر فقط إذا كان هناك مبلغ متبقي */}
                                                {group.remaining > 0 ? (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setNewPayment({ ...newPayment, bookingId: group.bookingId });
                                                            setShowAddPayment(true);
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                    >
                                                        <PlusIcon className="h-4 w-4" />
                                                        إضافة دفعة
                                                    </button>
                                                ) : (
                                                    <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1">
                                                        ✓ مكتمل
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* تفاصيل الدفعات - تظهر عند التوسيع */}
                                        {isExpanded && (
                                            <div className="border-t border-white/10 bg-white/5">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-right">
                                                        <thead>
                                                            <tr className="border-b border-white/10 bg-white/5">
                                                                <th className="p-3 font-semibold text-sm text-slate-300">#</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">تاريخ الدفعة</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">نوع الدفعة</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">المبلغ</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">إجمالي المدفوع</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">المتبقي بعد الدفعة</th>
                                                                <th className="p-3 font-semibold text-sm text-slate-300">إجراءات</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(() => {
                                                                let runningTotal = 0;
                                                                return group.payments.map((payment, index) => {
                                                                    runningTotal += payment.amount;
                                                                    const remainingAfter = group.unitPrice - runningTotal;
                                                                    const isBookingPayment = payment.paymentType === 'booking';
                                                                    const paymentTypeLabel = payment.paymentType === 'booking' ? 'دفعة الحجز الأولى' 
                                                                                           : payment.paymentType === 'final' ? 'دفعة نهائية'
                                                                                           : `قسط ${index}`;
                                                                    
                                                                    return (
                                                                        <tr key={payment.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                                            <td className="p-3 text-slate-400">{index + 1}</td>
                                                                            <td className="p-3 text-slate-300">{payment.paymentDate}</td>
                                                                            <td className="p-3">
                                                                                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                                                    isBookingPayment 
                                                                                        ? 'bg-blue-500/20 text-blue-300' 
                                                                                        : payment.paymentType === 'final'
                                                                                        ? 'bg-purple-500/20 text-purple-300'
                                                                                        : 'bg-emerald-500/20 text-emerald-300'
                                                                                }`}>
                                                                                    {paymentTypeLabel}
                                                                                </span>
                                                                            </td>
                                                                            <td className="p-3 font-semibold text-emerald-400">{formatCurrency(payment.amount)}</td>
                                                                            <td className="p-3 font-semibold text-blue-400">{formatCurrency(runningTotal)}</td>
                                                                            <td className="p-3 font-semibold text-amber-400">{formatCurrency(remainingAfter)}</td>
                                                                            <td className="p-3 flex items-center gap-2">
                                                                                {/* زر طباعة الإيصال */}
                                                                                {(() => {
                                                                                    const paymentInfo: PaymentInfo = {
                                                                                        id: payment.id,
                                                                                        date: payment.paymentDate,
                                                                                        amount: payment.amount,
                                                                                        paymentMethod: payment.paymentMethod || 'نقدي',
                                                                                        referenceNumber: payment.referenceNumber,
                                                                                        bookingId: payment.bookingId,
                                                                                        customerName: group.customerName,
                                                                                        unitName: group.unitName,
                                                                                        receiptNumber: `REC-${payment.id.slice(0, 8).toUpperCase()}`
                                                                                    };
                                                                                    return (
                                                                                        <PrintReceiptButton
                                                                                            payment={paymentInfo}
                                                                                            variant="icon"
                                                                                        />
                                                                                    );
                                                                                })()}
                                                                                {currentUser?.role === 'Admin' && !isBookingPayment && (
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            handleDeletePayment(payment);
                                                                                        }}
                                                                                        className="text-rose-400 hover:text-rose-300 transition-colors"
                                                                                        title="حذف الدفعة"
                                                                                    >
                                                                                        <TrashIcon className="h-5 w-5" />
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                });
                                                            })()}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                
                                                {/* قسم الدفعات المجدولة القادمة */}
                                                {scheduledPaymentsByBooking.has(group.bookingId) ? (
                                                    <div className="border-t border-white/10 p-4">
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <CalendarIcon className="h-5 w-5 text-blue-400" />
                                                            <h4 className="text-lg font-semibold text-white">جدول الدفعات المستقبلية</h4>
                                                            <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded text-xs">
                                                                {scheduledPaymentsByBooking.get(group.bookingId)?.filter(sp => sp.status === 'pending').length || 0} دفعة قادمة
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {scheduledPaymentsByBooking.get(group.bookingId)?.map((scheduledPayment, idx) => {
                                                                const dueDate = new Date(scheduledPayment.dueDate);
                                                                const today = new Date();
                                                                today.setHours(0, 0, 0, 0);
                                                                const isOverdue = scheduledPayment.status === 'pending' && dueDate < today;
                                                                const isDueSoon = scheduledPayment.status === 'pending' && !isOverdue && 
                                                                    (dueDate.getTime() - today.getTime()) <= 7 * 24 * 60 * 60 * 1000; // خلال 7 أيام
                                                                
                                                                return (
                                                                    <div 
                                                                        key={scheduledPayment.id} 
                                                                        className={`rounded-lg p-3 border ${
                                                                            scheduledPayment.status === 'paid' 
                                                                                ? 'bg-emerald-500/10 border-emerald-500/30' 
                                                                                : isOverdue 
                                                                                ? 'bg-rose-500/10 border-rose-500/30' 
                                                                                : isDueSoon
                                                                                ? 'bg-amber-500/10 border-amber-500/30'
                                                                                : 'bg-slate-800/50 border-slate-600/30'
                                                                        }`}
                                                                    >
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-slate-300 text-sm font-medium">
                                                                                القسط #{scheduledPayment.installmentNumber}
                                                                            </span>
                                                                            {scheduledPayment.status === 'paid' ? (
                                                                                <span className="flex items-center gap-1 text-emerald-400 text-xs">
                                                                                    <CheckCircleIcon className="h-4 w-4" />
                                                                                    مدفوع
                                                                                </span>
                                                                            ) : isOverdue ? (
                                                                                <span className="flex items-center gap-1 text-rose-400 text-xs">
                                                                                    <ExclamationCircleIcon className="h-4 w-4" />
                                                                                    متأخر
                                                                                </span>
                                                                            ) : isDueSoon ? (
                                                                                <span className="flex items-center gap-1 text-amber-400 text-xs">
                                                                                    <ClockIcon className="h-4 w-4" />
                                                                                    قريباً
                                                                                </span>
                                                                            ) : (
                                                                                <span className="flex items-center gap-1 text-slate-400 text-xs">
                                                                                    <ClockIcon className="h-4 w-4" />
                                                                                    قادم
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        
                                                                        <div className="text-lg font-bold text-white mb-1">
                                                                            {formatCurrency(scheduledPayment.amount)}
                                                                        </div>
                                                                        
                                                                        <div className="flex items-center gap-1 text-sm text-slate-400">
                                                                            <CalendarIcon className="h-4 w-4" />
                                                                            <span>تاريخ الاستحقاق: {scheduledPayment.dueDate}</span>
                                                                        </div>
                                                                        
                                                                        {scheduledPayment.paidDate && (
                                                                            <div className="flex items-center gap-1 text-sm text-emerald-400 mt-1">
                                                                                <CheckCircleIcon className="h-4 w-4" />
                                                                                <span>تاريخ السداد: {scheduledPayment.paidDate}</span>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* زر تسديد القسط */}
                                                                        {scheduledPayment.status !== 'paid' && (
                                                                            <button
                                                                                onClick={async () => {
                                                                                    // التحقق من التسلسل
                                                                                    const allScheduledForBooking = scheduledPaymentsByBooking.get(group.bookingId) || [];
                                                                                    const sortedScheduled = allScheduledForBooking.sort((a, b) => a.installmentNumber - b.installmentNumber);
                                                                                    
                                                                                    // إذا كان القسط الأول، يمكن تسديده مباشرة
                                                                                    if (scheduledPayment.installmentNumber === 1) {
                                                                                        try {
                                                                                            await scheduledPaymentsService.update(scheduledPayment.id, {
                                                                                                status: 'paid',
                                                                                                paidDate: new Date().toISOString().split('T')[0]
                                                                                            });
                                                                                            addToast('تم تسديد القسط بنجاح ✅', 'success');
                                                                                            loadAllData(); // إعادة تحميل البيانات
                                                                                        } catch (error) {
                                                                                            console.error('Error paying installment:', error);
                                                                                            addToast('خطأ في تسديد القسط', 'error');
                                                                                        }
                                                                                        return;
                                                                                    }
                                                                                    
                                                                                    // للأقساط الأخرى، التحقق من تسديد الأقساط السابقة
                                                                                    const previousPayments = sortedScheduled.filter(
                                                                                        p => p.installmentNumber < scheduledPayment.installmentNumber
                                                                                    );
                                                                                    
                                                                                    const allPreviousPaid = previousPayments.every(p => p.status === 'paid');
                                                                                    
                                                                                    if (!allPreviousPaid) {
                                                                                        const unpaidPrevious = previousPayments.find(p => p.status !== 'paid');
                                                                                        addToast(`⚠️ يجب تسديد القسط #${unpaidPrevious?.installmentNumber} أولاً`, 'warning');
                                                                                        return;
                                                                                    }
                                                                                    
                                                                                    // يمكن تسديده
                                                                                    try {
                                                                                        await scheduledPaymentsService.update(scheduledPayment.id, {
                                                                                            status: 'paid',
                                                                                            paidDate: new Date().toISOString().split('T')[0]
                                                                                        });
                                                                                        addToast('تم تسديد القسط بنجاح ✅', 'success');
                                                                                        loadAllData(); // إعادة تحميل البيانات
                                                                                    } catch (error) {
                                                                                        console.error('Error paying installment:', error);
                                                                                        addToast('خطأ في تسديد القسط', 'error');
                                                                                    }
                                                                                }}
                                                                                className={`mt-3 w-full py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                                                                                    scheduledPayment.installmentNumber === 1 || 
                                                                                    (scheduledPaymentsByBooking.get(group.bookingId) || [])
                                                                                        .filter(p => p.installmentNumber < scheduledPayment.installmentNumber)
                                                                                        .every(p => p.status === 'paid')
                                                                                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                                                                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 border border-amber-500/30'
                                                                                }`}
                                                                            >
                                                                                <CreditCardIcon className="h-4 w-4" />
                                                                                <span>تسديد القسط</span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        
                                                        {/* ملخص الدفعات المجدولة */}
                                                        {(() => {
                                                            const scheduled = scheduledPaymentsByBooking.get(group.bookingId) || [];
                                                            const totalScheduled = scheduled.reduce((sum, sp) => sum + sp.amount, 0);
                                                            const totalPaidScheduled = scheduled.filter(sp => sp.status === 'paid').reduce((sum, sp) => sum + sp.amount, 0);
                                                            const totalPendingScheduled = scheduled.filter(sp => sp.status === 'pending').reduce((sum, sp) => sum + sp.amount, 0);
                                                            const overdueCount = scheduled.filter(sp => {
                                                                if (sp.status !== 'pending') return false;
                                                                const dueDate = new Date(sp.dueDate);
                                                                const today = new Date();
                                                                today.setHours(0, 0, 0, 0);
                                                                return dueDate < today;
                                                            }).length;
                                                            
                                                            return (
                                                                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                                    <div>
                                                                        <span className="text-slate-400">إجمالي المجدول</span>
                                                                        <div className="text-white font-semibold">{formatCurrency(totalScheduled)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-slate-400">تم سداده</span>
                                                                        <div className="text-emerald-400 font-semibold">{formatCurrency(totalPaidScheduled)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-slate-400">متبقي للسداد</span>
                                                                        <div className="text-amber-400 font-semibold">{formatCurrency(totalPendingScheduled)}</div>
                                                                    </div>
                                                                    {overdueCount > 0 && (
                                                                        <div>
                                                                            <span className="text-slate-400">دفعات متأخرة</span>
                                                                            <div className="text-rose-400 font-semibold">{overdueCount} دفعة</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <div className="border-t border-white/10 p-4">
                                                        <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-lg border border-slate-600/30">
                                                            <CalendarIcon className="h-6 w-6 text-slate-400" />
                                                            <div>
                                                                <p className="text-slate-300 font-medium">لا توجد خطة دفع مجدولة</p>
                                                                <p className="text-slate-500 text-sm">يمكنك تفعيل خطة الدفع من صفحة الحجوزات عند تعديل هذا الحجز</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16 glass-card">
                            <CreditCardIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-2 text-lg font-medium text-white">لا توجد دفعات</h3>
                            <p className="mt-1 text-sm text-slate-300">لم يتم تسجيل أي دفعات من العملاء بعد.</p>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Modal */}
            {paymentToDelete && (
                <ConfirmModal
                    isOpen={!!paymentToDelete}
                    onClose={() => setPaymentToDelete(null)}
                    onConfirm={confirmDeletePayment}
                    title="تأكيد حذف الدفعة"
                    message={`هل أنت متأكد من حذف دفعة بمبلغ ${formatCurrency(paymentToDelete.amount)} للعميل ${paymentToDelete.customerName}؟ هذا الإجراء لا يمكن التراجع عنه.`}
                    confirmText="حذف"
                    cancelText="إلغاء"
                    type="danger"
                />
            )}
        </div>
    );
};

export default Payments;
