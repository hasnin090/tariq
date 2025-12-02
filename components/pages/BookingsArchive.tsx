import React, { useState, useEffect } from 'react';
import { Booking, Customer, Unit } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import logActivity from '../../utils/activityLogger';
import { formatCurrency } from '../../utils/currencyFormatter';
import { ArchiveIcon, TrashIcon, EyeIcon } from '../shared/Icons';
import { bookingsService, customersService, unitsService } from '../../src/services/supabaseService';
import ConfirmModal from '../shared/ConfirmModal';

const BookingsArchive: React.FC = () => {
    const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { addToast } = useToast();
    const { currentUser } = useAuth();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [bookingsData, customersData, unitsData] = await Promise.all([
                bookingsService.getAll(),
                customersService.getAll(),
                unitsService.getAll(),
            ]);
            
            // Filter only cancelled bookings
            const cancelled = bookingsData.filter(b => b.status === 'Cancelled');
            setCancelledBookings(cancelled);
            setCustomers(customersData);
            setUnits(unitsData);
        } catch (error) {
            console.error('Error loading data:', error);
            addToast('خطأ في تحميل البيانات.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = (booking: Booking) => {
        setSelectedBooking(booking);
        setShowDetailsModal(true);
    };

    const handleDeleteClick = (booking: Booking) => {
        if (currentUser?.role !== 'Admin') {
            addToast('هذه العملية متاحة للمدير فقط', 'error');
            return;
        }
        setBookingToDelete(booking);
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        if (!bookingToDelete) return;

        try {
            await bookingsService.delete(bookingToDelete.id);
            logActivity('Delete Archived Booking', `Permanently deleted cancelled booking for ${bookingToDelete.customerName}`);
            addToast('تم حذف الحجز نهائياً من الأرشيف', 'success');
            setShowDeleteConfirm(false);
            setBookingToDelete(null);
            loadData();
        } catch (error) {
            console.error('Error deleting booking:', error);
            addToast('خطأ في حذف الحجز.', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">جاري التحميل...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <ArchiveIcon className="h-8 w-8 text-slate-600 dark:text-slate-300" />
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">أرشيف الحجوزات الملغاة</h2>
            </div>

            <div className="glass-card overflow-hidden">
                {cancelledBookings.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead>
                                <tr className="border-b-2 border-white/20 bg-white/5">
                                    <th className="p-4 font-bold text-sm text-slate-200">التاريخ</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">الوحدة</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">العميل</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">المبلغ المدفوع</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">تاريخ الإلغاء</th>
                                    <th className="p-4 font-bold text-sm text-slate-200">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cancelledBookings.map(booking => (
                                    <tr key={booking.id} className="border-b border-white/10 hover:bg-white/5">
                                        <td className="p-4 text-slate-300 whitespace-nowrap">{booking.bookingDate}</td>
                                        <td className="p-4 font-medium text-slate-100">{booking.unitName}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">{booking.customerName}</td>
                                        <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(booking.amountPaid)}</td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm whitespace-nowrap">
                                            {booking.bookingDate}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleShowDetails(booking)}
                                                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                    title="عرض التفاصيل"
                                                >
                                                    <EyeIcon className="h-5 w-5" />
                                                </button>
                                                {currentUser?.role === 'Admin' && (
                                                    <button
                                                        onClick={() => handleDeleteClick(booking)}
                                                        className="text-rose-600 hover:text-rose-800 dark:text-rose-400 dark:hover:text-rose-300"
                                                        title="حذف نهائياً"
                                                    >
                                                        <TrashIcon className="h-5 w-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <ArchiveIcon className="mx-auto h-16 w-16 text-slate-400 mb-4" />
                        <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">لا توجد حجوزات ملغاة</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">الأرشيف فارغ حالياً.</p>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedBooking && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4 pt-20" onClick={() => setShowDetailsModal(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">تفاصيل الحجز الملغي</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">الوحدة</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedBooking.unitName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">العميل</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedBooking.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">تاريخ الحجز</p>
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedBooking.bookingDate}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">المبلغ المدفوع</p>
                                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedBooking.amountPaid)}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">الحالة</p>
                                    <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded-full text-sm font-semibold">
                                        ملغي
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-600"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && bookingToDelete && (
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onClose={() => setShowDeleteConfirm(false)}
                    onConfirm={handleConfirmDelete}
                    title="تأكيد الحذف النهائي"
                    message={`هل أنت متأكد من حذف حجز ${bookingToDelete.customerName} للوحدة ${bookingToDelete.unitName} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.`}
                    confirmText="حذف نهائياً"
                    cancelText="إلغاء"
                    type="danger"
                />
            )}
        </div>
    );
};

export default BookingsArchive;
