import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import gsap from 'gsap';
import { Booking, Customer, Unit } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import logActivity from '../../../utils/activityLogger';
import { formatCurrency } from '../../../utils/currencyFormatter';
import { ArchiveIcon, TrashIcon, EyeIcon } from '../../shared/Icons';
import { bookingsService, customersService, unitsService } from '../../../src/services/supabaseService';
import ConfirmModal from '../../shared/ConfirmModal';

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
    
    // Modal animation refs
    const detailsOverlayRef = useRef<HTMLDivElement>(null);
    const detailsModalRef = useRef<HTMLDivElement>(null);
    
    // GSAP animation for details modal
    useLayoutEffect(() => {
        if (showDetailsModal && detailsOverlayRef.current && detailsModalRef.current) {
            const tl = gsap.timeline();
            tl.fromTo(detailsOverlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.25, ease: "power2.out" }
            );
            tl.fromTo(detailsModalRef.current,
                { opacity: 0, scale: 0.85, y: 30 },
                { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "back.out(1.5)" },
                0.05
            );
        }
    }, [showDetailsModal]);

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
            logActivity('Delete Archived Booking', `Permanently deleted cancelled booking for ${bookingToDelete.customerName}`, 'projects');
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
                <div ref={detailsOverlayRef} className="fixed inset-0 z-[60] bg-slate-900/75 backdrop-blur-md flex items-start justify-center pt-20 pb-8 overflow-y-auto" onClick={() => setShowDetailsModal(false)} style={{ perspective: '1000px' }}>
                    <div ref={detailsModalRef} className="w-full max-w-2xl mx-4 backdrop-blur-2xl bg-gradient-to-br from-white/15 to-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] border border-white/20 rounded-3xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-white/20 bg-gradient-to-br from-white/10 to-transparent">
                            <h3 className="text-xl font-bold text-white">تفاصيل الحجز الملغي</h3>
                        </div>
                        <div className="p-6 space-y-4 text-white">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">الوحدة</p>
                                    <p className="font-semibold text-white">{selectedBooking.unitName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">العميل</p>
                                    <p className="font-semibold text-white">{selectedBooking.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">تاريخ الحجز</p>
                                    <p className="font-semibold text-white">{selectedBooking.bookingDate}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400 mb-1">المبلغ المدفوع</p>
                                    <p className="font-semibold text-emerald-400">{formatCurrency(selectedBooking.amountPaid)}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-slate-400 mb-1">الحالة</p>
                                    <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-sm font-semibold border border-rose-500/30">
                                        ملغي
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-5 border-t border-white/20 flex justify-end">
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="px-6 py-2.5 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 border border-white/20"
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
