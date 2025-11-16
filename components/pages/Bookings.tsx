import React, { useState, useEffect } from 'react';
import { Booking, Unit, Customer, Payment, Account, Transaction } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import { bookingsService, unitsService, customersService, paymentsService, accountsService } from '../../src/services/supabaseService';
import ConfirmModal from '../shared/ConfirmModal';
import DocumentManager from '../shared/DocumentManager';
import { CloseIcon, DocumentTextIcon } from '../shared/Icons';

export const Bookings: React.FC = () => {
    const { addToast } = useToast();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [bookingPayments, setBookingPayments] = useState<Map<string, { totalPaid: number, paymentCount: number }>>(new Map());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [isDocManagerOpen, setIsDocManagerOpen] = useState(false);
    const [selectedBookingForDocs, setSelectedBookingForDocs] = useState<Booking | null>(null);

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

        return () => {
            bookingsSubscription?.unsubscribe();
            unitsSubscription?.unsubscribe();
            customersSubscription?.unsubscribe();
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

    const handleSave = async (bookingData: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => {
        try {
            const unit = units.find(u => u.id === bookingData.unitId);
            const customer = customers.find(c => c.id === bookingData.customerId);
            if (!unit || !customer) {
                addToast('تأكد من اختيار وحدة وعميل صحيحة', 'error');
                return;
            }

            // Convert camelCase to snake_case for database
            const dbData = {
                unit_id: bookingData.unitId,
                customer_id: bookingData.customerId,
                booking_date: bookingData.bookingDate,
                amount_paid: bookingData.amountPaid,
                unit_name: unit.name,
                customer_name: customer.name,
            };

            if (editingBooking) {
                await bookingsService.update(editingBooking.id, dbData as any);
                logActivity('Update Booking', `Updated booking for ${customer.name}`);
                addToast('تم تحديث الحجز بنجاح', 'success');
            } else {
                const newBooking = { 
                    ...dbData, 
                    status: 'Active' 
                };
                const createdBooking = await bookingsService.create(newBooking as any);
                logActivity('Add Booking', `Added booking for ${customer.name}`);
                
                // Create payment record if amountPaid > 0
                if (bookingData.amountPaid > 0 && createdBooking) {
                    const payment: Omit<Payment, 'id' | 'remainingAmount'> = {
                        bookingId: createdBooking.id,
                        customerId: customer.id,
                        customerName: customer.name,
                        unitId: unit.id,
                        unitName: unit.name,
                        amount: bookingData.amountPaid,
                        paymentDate: bookingData.bookingDate,
                        unitPrice: unit.price,
                        accountId: (bookingData as any).accountId || 'default',
                    };
                    try {
                        await paymentsService.create(payment);
                        logActivity('Add Payment', `Created payment of ${formatCurrency(bookingData.amountPaid)} for booking`);
                    } catch (error) {
                        console.error('Error creating payment:', error);
                        // Continue anyway, payment is not critical
                    }
                }
                
                addToast('تم إضافة الحجز بنجاح', 'success');
            }
            handleCloseModal();
            await loadData();
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
            await bookingsService.update(bookingToCancel.id, { status: 'Cancelled' } as any);
            
            const unit = units.find(u => u.id === bookingToCancel.unitId);
            if (unit) {
                await unitsService.update(unit.id, { status: 'Available', customer_id: undefined, customer_name: undefined } as any);
            }
            
            logActivity('Cancel Booking', `Cancelled booking for unit ${bookingToCancel.unitName}`);
            addToast('تم إلغاء الحجز بنجاح', 'success');
            setBookingToCancel(null);
            await loadData();
        } catch (error) {
            console.error('Error canceling booking:', error);
            addToast('خطأ في إلغاء الحجز', 'error');
        }
    };
    
    const getStatusStyle = (status: Booking['status']) => {
        switch (status) {
            case 'Active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300';
            case 'Cancelled': return 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300';
            case 'Completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300';
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
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right">
                    <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الحجز</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">سعر الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجمالي المدفوع</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">عدد الدفعات</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المتبقي</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th></tr></thead>
                    <tbody>
                        {bookings.map(booking => {
                            const unit = units.find(u => u.id === booking.unitId);
                            const unitPrice = unit?.price || 0;
                            const bookingPaymentInfo = bookingPayments.get(booking.id);
                            const totalPaid = (bookingPaymentInfo?.totalPaid || 0) + booking.amountPaid;
                            const paymentCount = (bookingPaymentInfo?.paymentCount || 0) + (booking.amountPaid > 0 ? 1 : 0);
                            const remainingAmount = unitPrice - totalPaid;
                            return (
                            <tr key={booking.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{booking.unitName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.customerName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.bookingDate}</td>
                                <td className="p-4 font-semibold text-slate-800 dark:text-slate-100">{formatCurrency(unitPrice)}</td>
                                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(totalPaid)}</td>
                                <td className="p-4 text-center">
                                    <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-semibold">
                                        {paymentCount}
                                    </span>
                                </td>
                                <td className="p-4 font-semibold">
                                    <span className={remainingAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                                        {formatCurrency(remainingAmount)}
                                    </span>
                                </td>
                                <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(booking.status)}`}>{booking.status}</span></td>
                                <td className="p-4 space-x-4">
                                    <button onClick={() => handleOpenDocManager(booking)} className="text-teal-600 hover:underline font-semibold">المستندات</button>
                                    {booking.status === 'Active' && <button onClick={() => handleCancelRequest(booking)} className="text-rose-600 dark:text-rose-400 hover:underline font-semibold">إلغاء</button>}
                                </td>
                            </tr>
                        );
                        })}
                    </tbody>
                </table>
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
                />
            )}
            <ConfirmModal isOpen={!!bookingToCancel} onClose={() => setBookingToCancel(null)} onConfirm={confirmCancel} title="تأكيد إلغاء الحجز" message={`هل أنت متأكد من إلغاء حجز الوحدة "${bookingToCancel?.unitName}"؟ ستعود الوحدة متاحة.`} />
        </div>
    );
};

interface PanelProps { booking: Booking | null; units: Unit[]; customers: Customer[]; accounts: Account[]; onClose: () => void; onSave: (data: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => void; }

const BookingPanel: React.FC<PanelProps> = ({ booking, units, customers, accounts, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        unitId: booking?.unitId || '',
        customerId: booking?.customerId || '',
        bookingDate: booking?.bookingDate || new Date().toISOString().split('T')[0],
        amountPaid: booking?.amountPaid || 0,
        accountId: accounts.length > 0 ? accounts[0].id : '',
    });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.unitId || !formData.customerId) {
            addToast('يرجى اختيار وحدة وعميل.', 'error');
            return;
        }
        onSave(formData);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amountPaid' ? Number(value) : value }));
    };

    const inputStyle = "w-full p-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200";

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 animate-drawer-overlay-show" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{booking ? 'تعديل حجز' : 'حجز جديد'}</h2>
                        <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <CloseIcon className="h-6 w-6"/>
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <select name="unitId" value={formData.unitId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required>
                            <option value="">اختر وحدة</option>
                            {units.map(u => <option key={u.id} value={u.id}>{`${u.name} (${formatCurrency(u.price)})`}</option>)}
                        </select>
                        <select name="customerId" value={formData.customerId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`} required>
                            <option value="">اختر عميل</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="date" name="bookingDate" value={formData.bookingDate} onChange={handleChange} className={inputStyle} required />
                        <input type="number" name="amountPaid" placeholder="المبلغ المدفوع مقدمًا" value={formData.amountPaid} onChange={handleChange} className={inputStyle} min="0" />
                        {accounts.length > 0 && (
                            <select name="accountId" value={formData.accountId} onChange={handleChange} className={`${inputStyle} bg-white dark:bg-slate-700`}>
                                <option value="">اختر حساب الدفع (اختياري)</option>
                                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold">إلغاء</button>
                        <button type="submit" className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 font-semibold shadow-sm">حفظ</button>
                    </div>
                </form>
            </div>
        </div>
    );
};