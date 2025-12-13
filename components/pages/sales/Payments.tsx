import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Payment, Customer, Booking, Unit } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useProject } from '../../../contexts/ProjectContext';
import ProjectSelector from '../../shared/ProjectSelector';
import { filterPaymentsByProject } from '../../../utils/projectFilters';
import { formatCurrency } from '../../../utils/currencyFormatter';
import logActivity from '../../../utils/activityLogger';
import { paymentsService, customersService, bookingsService, unitsService, documentsService } from '../../../src/services/supabaseService';
import { CreditCardIcon, PrinterIcon, PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, UploadIcon, FileIcon } from '../../shared/Icons';
import ConfirmModal from '../../shared/ConfirmModal';

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

    // تجميع الدفعات حسب الحجز
    const groupedPayments = useMemo(() => {
        const groups = new Map<string, BookingPaymentGroup>();
        
        allPaymentsWithBooking.forEach(payment => {
            if (!groups.has(payment.bookingId)) {
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
    }, [allPaymentsWithBooking]);

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
            setBookings(data.filter(b => b.status === 'Active'));
            mergePaymentsWithBookings(payments, data.filter(b => b.status === 'Active'), units);
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
            const activeBookings = bookingsData.filter(b => b.status === 'Active');
            
            setPayments(sortedPayments);
            setCustomers(customersData);
            setBookings(activeBookings);
            setUnits(unitsData);
            
            // Now merge after all data is loaded
            mergePaymentsWithBookings(sortedPayments, activeBookings, unitsData);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
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



    const handleDeletePayment = (payment: Payment) => {
        if (currentUser?.role !== 'Admin') {
            addToast('هذه العملية متاحة للمدير فقط', 'error');
            return;
        }
        
        // Check if this is a booking payment (cannot be deleted)
        if (payment.paymentType === 'booking') {
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
            await paymentsService.delete(paymentToDelete.id);
            logActivity('Delete Payment', `Deleted additional payment of ${formatCurrency(paymentToDelete.amount)} for ${paymentToDelete.customerName}`);
            addToast(`تم حذف الدفعة الإضافية بمبلغ ${formatCurrency(paymentToDelete.amount)} بنجاح`, 'success');
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
                addToast('تم إضافة الدفعة واكتمال سداد الوحدة بنجاح 🎉', 'success');
                logActivity('Payment Complete', `Booking ${booking.id} completed - Unit ${unit.name} marked as Sold`);
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
        } catch (error) {
            console.error('Error loading customer payments:', error);
            addToast('خطأ في تحميل الدفعات', 'error');
        }
    };

    const handlePrint = () => {
        if (showCustomerPayments && selectedCustomer) {
            const customer = customers.find(c => c.id === selectedCustomer);
            const printWindow = window.open('', '', 'height=600,width=800');
            if (printWindow) {
                const totalPaid = customerPayments.reduce((sum, p) => sum + p.amount, 0);
                
                // Format currency for print
                const formatForPrint = (value: number): string => {
                    return new Intl.NumberFormat('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                        minimumFractionDigits: 2,
                    }).format(value);
                };
                
                const paymentRows = customerPayments.map(p => `
                    <tr>
                        <td>${p.paymentDate}</td>
                        <td>${p.unitName}</td>
                        <td>${formatForPrint(p.amount)}</td>
                        <td>${formatForPrint(p.unitPrice)}</td>
                        <td>${formatForPrint(p.remainingAmount)}</td>
                    </tr>
                `).join('');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html dir="rtl">
                    <head>
                        <meta charset="UTF-8">
                        <title>كشف حساب العميل</title>
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { 
                                font-family: 'Arial', sans-serif; 
                                direction: rtl; 
                                padding: 20px;
                                background-color: #f9f9f9;
                            }
                            .container { 
                                max-width: 900px; 
                                margin: 0 auto;
                                background-color: white;
                                padding: 30px;
                                border-radius: 8px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            }
                            .header { 
                                text-align: center; 
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 20px;
                            }
                            .header h2 { 
                                font-size: 24px;
                                font-weight: bold;
                                margin-bottom: 15px;
                                color: #333;
                            }
                            .header p { 
                                font-size: 14px;
                                margin: 5px 0;
                                color: #666;
                            }
                            .header strong { 
                                color: #333;
                                display: inline-block;
                                margin-left: 10px;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse;
                                margin: 20px 0;
                            }
                            th { 
                                background-color: #2c3e50;
                                color: white;
                                padding: 15px;
                                text-align: right;
                                font-weight: bold;
                                font-size: 14px;
                                border: 1px solid #34495e;
                            }
                            td { 
                                padding: 12px 15px;
                                text-align: right;
                                border: 1px solid #ddd;
                                font-size: 13px;
                                color: #333;
                            }
                            tbody tr:nth-child(even) {
                                background-color: #f5f5f5;
                            }
                            tbody tr:hover {
                                background-color: #eff3f5;
                            }
                            .total-section { 
                                margin-top: 30px;
                                padding-top: 20px;
                                border-top: 2px solid #2c3e50;
                                text-align: left;
                            }
                            .total-section p {
                                font-size: 16px;
                                font-weight: bold;
                                color: #27ae60;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 12px;
                                color: #999;
                                border-top: 1px solid #ddd;
                                padding-top: 15px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h2>كشف حساب العميل</h2>
                                <p><strong>اسم العميل:</strong> ${customer?.name || 'غير محدد'}</p>
                                <p><strong>البريد الإلكتروني:</strong> ${customer?.email || 'غير محدد'}</p>
                                <p><strong>الهاتف:</strong> ${customer?.phone || 'غير محدد'}</p>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>التاريخ</th>
                                        <th>الوحدة</th>
                                        <th>المبلغ المدفوع</th>
                                        <th>سعر الوحدة</th>
                                        <th>المبلغ المتبقي</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${paymentRows}
                                </tbody>
                            </table>
                            <div class="total-section">
                                <p>إجمالي المدفوع: ${formatForPrint(totalPaid)}</p>
                            </div>
                            <div class="footer">
                                <p>تم الطباعة في: ${new Date().toLocaleDateString('ar-SA')}</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.print();
            }
        } else {
            window.print();
        }
    };

    return (
        <div className="container mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">سجل الدفعات</h2>
                <div className="flex gap-3">
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
                                    <input
                                        type="number"
                                        value={newPayment.amount || ''}
                                        onChange={(e) => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) || 0 })}
                                        className="input-field"
                                        placeholder="أدخل المبلغ"
                                        step="0.01"
                                        min="0"
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
                    <button onClick={() => setShowCustomerPayments(false)} className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg border border-white/20 transition-colors">العودة</button>
                    <div className="glass-card overflow-hidden mb-6">
                        <div className="p-6">
                            <h3 className="text-xl font-bold mb-4 text-white">دفعات العميل</h3>
                            {customerPayments.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-right min-w-[700px]">
                                    <thead>
                                        <tr className="border-b-2 border-white/20 bg-white/5">
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
                                                                            <td className="p-3">
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
