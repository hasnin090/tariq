import React, { useState, useEffect, useMemo } from 'react';
import { Payment, Customer, Booking, Unit } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProject } from '../../contexts/ProjectContext';
import ProjectSelector from '../shared/ProjectSelector';
import { filterPaymentsByProject } from '../../utils/projectFilters';
import { formatCurrency } from '../../utils/currencyFormatter';
import logActivity from '../../utils/activityLogger';
import { paymentsService, customersService, bookingsService, unitsService } from '../../src/services/supabaseService';
import { CreditCardIcon, PrinterIcon, PlusIcon, TrashIcon } from '../shared/Icons';
import ConfirmModal from '../shared/ConfirmModal';

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
    const [newPayment, setNewPayment] = useState({
        bookingId: '',
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
    });
    const [searchTerm, setSearchTerm] = useState('');

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
            
            // Calculate total paid for this booking
            const bookingAmountPaid = booking.amountPaid || 0;
            const additionalPayments = paymentsByBooking.get(booking.id) || [];
            const additionalTotal = additionalPayments.reduce((sum, p) => sum + p.amount, 0);
            const totalPaid = bookingAmountPaid + additionalTotal;
            
            // Add booking payment (if exists)
            if (bookingAmountPaid > 0) {
                const bookingPayment: Payment = {
                    id: `booking_${booking.id}`,
                    bookingId: booking.id,
                    customerId: booking.customerId,
                    customerName: booking.customerName,
                    unitId: booking.unitId,
                    unitName: booking.unitName,
                    amount: bookingAmountPaid, // Fixed: always show booking amount
                    paymentDate: booking.bookingDate,
                    unitPrice: unitPrice,
                    remainingAmount: unitPrice - bookingAmountPaid, // After booking payment only
                    accountId: '',
                };
                combined.push(bookingPayment);
            }
            
            // Add additional payments with cumulative remaining amount
            let cumulativePaid = bookingAmountPaid;
            additionalPayments.forEach(payment => {
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
        if (payment.id.startsWith('booking_')) {
            addToast('لا يمكن حذف دفعة الحجز. يجب حذف الحجز بالكامل.', 'error');
            return;
        }
        
        setPaymentToDelete(payment);
    };

    const confirmDeletePayment = async () => {
        if (!paymentToDelete) return;
        
        // Double check it's not a booking payment
        if (paymentToDelete.id.startsWith('booking_')) {
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

            const payment: Omit<Payment, 'id' | 'remainingAmount'> = {
                bookingId: booking.id,
                customerId: booking.customerId,
                customerName: booking.customerName,
                unitId: booking.unitId,
                unitName: booking.unitName,
                amount: newPayment.amount,
                paymentDate: newPayment.paymentDate,
                unitPrice: unit.price,
                accountId: 'default',
            };

            await paymentsService.create(payment);
            addToast('تم إضافة الدفعة بنجاح', 'success');
            setShowAddPayment(false);
            setNewPayment({
                bookingId: '',
                amount: 0,
                paymentDate: new Date().toISOString().split('T')[0],
            });
            await loadAllData();
        } catch (error) {
            console.error('Error saving payment:', error);
            addToast('خطأ في حفظ الدفعة', 'error');
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
                                        {bookings.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.customerName} - {b.unitName} ({formatCurrency(b.amountPaid)} مدفوع)
                                            </option>
                                        ))}
                                    </select>
                                </div>

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
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleSavePayment}
                                    className="btn-primary flex-1"
                                >
                                    حفظ
                                </button>
                                <button
                                    onClick={() => setShowAddPayment(false)}
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
                    {allPaymentsWithBooking.length > 0 ? (
                        <div className="glass-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right min-w-[800px]">
                                <thead>
                                    <tr className="border-b-2 border-white/20 bg-white/5">
                                        <th className="p-4 font-bold text-sm text-slate-200">تاريخ الدفعة</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">النوع</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">العميل</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">الوحدة</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">المبلغ المدفوع</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">المبلغ المتبقي</th>
                                        <th className="p-4 font-bold text-sm text-slate-200">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAllPayments.map(payment => {
                                        const isBookingPayment = payment.id.startsWith('booking_');
                                        return (
                                            <tr key={payment.id} className="border-b border-white/10 hover:bg-white/5 transition-colors duration-200">
                                                <td className="p-4 text-slate-300">{payment.paymentDate}</td>
                                                <td className="p-4">
                                                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                                        isBookingPayment 
                                                            ? 'bg-blue-500/20 text-blue-200' 
                                                            : 'bg-emerald-500/20 text-emerald-200'
                                                    }`}>
                                                        {isBookingPayment ? 'دفعة حجز' : 'دفعة إضافية'}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-medium text-slate-100">{payment.customerName}</td>
                                                <td className="p-4 text-slate-300">{payment.unitName}</td>
                                                <td className="p-4 font-semibold text-emerald-400">{formatCurrency(payment.amount)}</td>
                                                <td className="p-4 font-semibold text-amber-400">{formatCurrency(payment.remainingAmount)}</td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => handleViewCustomerPayments(payment.customerId)} className="text-blue-300 hover:text-blue-200 hover:underline font-semibold">عرض الكل</button>
                                                        {currentUser?.role === 'Admin' && !isBookingPayment && (
                                                            <button
                                                                onClick={() => handleDeletePayment(payment)}
                                                                className="text-rose-400 hover:text-rose-300"
                                                                title="حذف الدفعة"
                                                            >
                                                                <TrashIcon className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
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