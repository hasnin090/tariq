import React, { useState, useEffect } from 'react';
import { Booking, Unit, Customer, Payment, Account, Transaction } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import ConfirmModal from '../shared/ConfirmModal';
import { CloseIcon, DocumentTextIcon } from '../shared/Icons';

export const Bookings: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);

    useEffect(() => {
        setBookings(JSON.parse(localStorage.getItem('bookings') || '[]'));
        setUnits(JSON.parse(localStorage.getItem('units') || '[]'));
        setCustomers(JSON.parse(localStorage.getItem('customers') || '[]'));
        setAccounts(JSON.parse(localStorage.getItem('accounts') || '[]'));
    }, []);

    const saveData = (key: string, data: any[]) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const handleOpenModal = (booking: Booking | null) => {
        setEditingBooking(booking);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingBooking(null);
        setIsModalOpen(false);
    };

    const handleSave = (bookingData: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => {
        const unit = units.find(u => u.id === bookingData.unitId);
        const customer = customers.find(c => c.id === bookingData.customerId);
        const account = accounts.find(a => a.id === 'acc_1'); // Assume default account for now. Should be selectable.
        if (!unit || !customer || !account) return;

        if (editingBooking) {
            // Update logic here
        } else {
            const newBooking: Booking = { 
                id: `bk_${Date.now()}`, 
                ...bookingData, 
                unitName: unit.name, 
                customerName: customer.name, 
                status: 'Active' 
            };
            
            const allBookings = [...bookings, newBooking];
            saveData('bookings', allBookings);
            setBookings(allBookings);

            // Update Unit status
            const updatedUnits = units.map(u => u.id === unit.id ? { ...u, status: 'Booked', customerId: customer.id, customerName: customer.name } : u);
            saveData('units', updatedUnits);
            setUnits(updatedUnits);

            // Create initial payment and transaction
            if (bookingData.amountPaid > 0) {
                const allPayments = JSON.parse(localStorage.getItem('payments') || '[]');
                const allTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
                const newPayment: Payment = {
                    id: `pay_${Date.now()}`,
                    customerId: customer.id,
                    customerName: customer.name,
                    unitId: unit.id,
                    unitName: unit.name,
                    amount: bookingData.amountPaid,
                    paymentDate: bookingData.bookingDate,
                    accountId: account.id,
                };
                const newTransaction: Transaction = {
                    id: `trans_${Date.now()}`,
                    accountId: account.id,
                    accountName: account.name,
                    type: 'Deposit',
                    date: bookingData.bookingDate,
                    description: `دفعة حجز للوحدة ${unit.name}`,
                    amount: bookingData.amountPaid,
                    sourceId: newPayment.id,
                    sourceType: 'Payment',
                };
                newPayment.transactionId = newTransaction.id;
                saveData('payments', [...allPayments, newPayment]);
                saveData('transactions', [...allTransactions, newTransaction]);
            }

            logActivity('New Booking', `Booked unit ${unit.name} for ${customer.name}`);
        }
        handleCloseModal();
    };
    
    const handleCancelRequest = (booking: Booking) => {
        setBookingToCancel(booking);
    };
    
    const confirmCancel = () => {
        if (!bookingToCancel) return;
        // FIX: Explicitly typed the `updatedBookings` variable to `Booking[]` to resolve a TypeScript type inference error where the status property was being widened to `string` instead of the correct union type.
        const updatedBookings: Booking[] = bookings.map(b => b.id === bookingToCancel.id ? { ...b, status: 'Cancelled' } : b);
        saveData('bookings', updatedBookings);
        setBookings(updatedBookings);

        const updatedUnits = units.map(u => u.id === bookingToCancel.unitId ? { ...u, status: 'Available', customerId: undefined, customerName: undefined } : u);
        saveData('units', updatedUnits);
        setUnits(updatedUnits);
        
        logActivity('Cancel Booking', `Cancelled booking for unit ${bookingToCancel.unitName}`);
        setBookingToCancel(null);
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
                    <thead><tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700"><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الوحدة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">العميل</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">تاريخ الحجز</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">المبلغ المدفوع</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">الحالة</th><th className="p-4 font-bold text-sm text-slate-700 dark:text-slate-200">إجراءات</th></tr></thead>
                    <tbody>
                        {bookings.map(booking => (
                            <tr key={booking.id} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                                <td className="p-4 font-medium text-slate-800 dark:text-slate-200">{booking.unitName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.customerName}</td>
                                <td className="p-4 text-slate-600 dark:text-slate-300">{booking.bookingDate}</td>
                                <td className="p-4 text-emerald-600 dark:text-emerald-400 font-semibold">{formatCurrency(booking.amountPaid)}</td>
                                <td className="p-4"><span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusStyle(booking.status)}`}>{booking.status}</span></td>
                                <td className="p-4">
                                    {booking.status === 'Active' && <button onClick={() => handleCancelRequest(booking)} className="text-rose-600 dark:text-rose-400 hover:underline font-semibold">إلغاء</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {bookings.length === 0 && <p className="text-center p-8 text-slate-500 dark:text-slate-400">لا توجد حجوزات حالية.</p>}
            </div>
            {isModalOpen && <BookingPanel booking={editingBooking} units={units.filter(u => u.status === 'Available')} customers={customers} onClose={handleCloseModal} onSave={handleSave} />}
            <ConfirmModal isOpen={!!bookingToCancel} onClose={() => setBookingToCancel(null)} onConfirm={confirmCancel} title="تأكيد إلغاء الحجز" message={`هل أنت متأكد من إلغاء حجز الوحدة "${bookingToCancel?.unitName}"؟ ستعود الوحدة متاحة.`} />
        </div>
    );
};

interface PanelProps { booking: Booking | null; units: Unit[]; customers: Customer[]; onClose: () => void; onSave: (data: Omit<Booking, 'id' | 'unitName' | 'customerName' | 'status'>) => void; }

const BookingPanel: React.FC<PanelProps> = ({ booking, units, customers, onClose, onSave }) => {
    const { addToast } = useToast();
    const [formData, setFormData] = useState({
        unitId: booking?.unitId || '',
        customerId: booking?.customerId || '',
        bookingDate: booking?.bookingDate || new Date().toISOString().split('T')[0],
        amountPaid: booking?.amountPaid || 0,
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