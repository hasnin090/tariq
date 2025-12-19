import React, { useState, useEffect, useMemo } from 'react';
import { ScheduledPayment, PaymentNotification, Booking, Customer } from '../../../types';
import { useToast } from '../../../contexts/ToastContext';
import { useProject } from '../../../contexts/ProjectContext';
import { scheduledPaymentsService, paymentNotificationsService, bookingsService, customersService } from '../../../src/services/supabaseService';
import { formatCurrency } from '../../../utils/currencyFormatter';
import ProjectSelector from '../../shared/ProjectSelector';
import Modal from '../../shared/Modal';

export const ScheduledPayments: React.FC = () => {
    const { addToast } = useToast();
    const { activeProject, availableProjects, setActiveProject } = useProject();
    const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
    const [notifications, setNotifications] = useState<PaymentNotification[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [tablesExist, setTablesExist] = useState(true); // هل الجداول موجودة في قاعدة البيانات
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'paid' | 'notifications'>('upcoming');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<ScheduledPayment | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // تحميل البيانات الأساسية أولاً
            const [bookingsData, customersData] = await Promise.all([
                bookingsService.getAll(),
                customersService.getAll(),
            ]);
            
            setBookings(bookingsData);
            setCustomers(customersData);
            
            let tablesFound = true;
            
            // محاولة تحميل الدفعات المجدولة (قد لا يكون الجدول موجود)
            try {
                const paymentsData = await scheduledPaymentsService.getAll();
                setScheduledPayments(paymentsData);
            } catch (err: any) {
                // إذا كان الجدول غير موجود، تجاهل الخطأ
                if (err?.code === 'PGRST205') {
                    console.warn('جدول scheduled_payments غير موجود بعد - يجب تنفيذ الهجرة');
                    setScheduledPayments([]);
                    tablesFound = false;
                } else {
                    throw err;
                }
            }
            
            // محاولة تحميل الإشعارات (قد لا يكون الجدول موجود)
            try {
                const notificationsData = await paymentNotificationsService.getUnread();
                setNotifications(notificationsData);
            } catch (err: any) {
                if (err?.code === 'PGRST205') {
                    console.warn('جدول payment_notifications غير موجود بعد - يجب تنفيذ الهجرة');
                    setNotifications([]);
                    tablesFound = false;
                } else {
                    throw err;
                }
            }
            
            setTablesExist(tablesFound);
        } catch (error) {
            console.error('Error loading scheduled payments:', error);
            addToast('خطأ في تحميل البيانات', 'error');
        } finally {
            setLoading(false);
        }
    };

    // إنشاء map للعملاء والحجوزات
    const customersMap = useMemo(() => {
        return new Map(customers.map(c => [c.id, c]));
    }, [customers]);

    const bookingsMap = useMemo(() => {
        return new Map(bookings.map(b => [b.id, b]));
    }, [bookings]);

    // فلترة الدفعات حسب التاب النشط
    const filteredPayments = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        
        return scheduledPayments.filter(payment => {
            // فلتر حسب المشروع إذا كان محدد
            if (activeProject) {
                const booking = bookingsMap.get(payment.bookingId);
                if (!booking) return false;
                // يمكنك إضافة فلتر المشروع هنا إذا كان الحجز مرتبط بمشروع
            }
            
            // فلتر حسب الحجز المحدد
            if (selectedBookingId && payment.bookingId !== selectedBookingId) {
                return false;
            }
            
            switch (activeTab) {
                case 'upcoming':
                    return payment.status === 'pending' && payment.dueDate >= today;
                case 'overdue':
                    return payment.status === 'overdue' || (payment.status === 'pending' && payment.dueDate < today);
                case 'paid':
                    return payment.status === 'paid';
                default:
                    return true;
            }
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [scheduledPayments, activeTab, selectedBookingId, activeProject, bookingsMap]);

    // إحصائيات
    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const pendingPayments = scheduledPayments.filter(p => p.status === 'pending');
        const overduePayments = scheduledPayments.filter(p => p.status === 'overdue' || (p.status === 'pending' && p.dueDate < today));
        const paidPayments = scheduledPayments.filter(p => p.status === 'paid');
        
        return {
            totalPending: pendingPayments.length,
            totalPendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
            totalOverdue: overduePayments.length,
            totalOverdueAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
            totalPaid: paidPayments.length,
            totalPaidAmount: paidPayments.reduce((sum, p) => sum + p.amount, 0),
            unreadNotifications: notifications.length,
        };
    }, [scheduledPayments, notifications]);

    // تحديث حالة الدفعة إلى مدفوعة
    const handleMarkAsPaid = async (payment: ScheduledPayment) => {
        try {
            await scheduledPaymentsService.update(payment.id, {
                status: 'paid',
                paidDate: new Date().toISOString().split('T')[0],
            });
            addToast('تم تسجيل الدفعة بنجاح', 'success');
            await loadData();
        } catch (error) {
            console.error('Error marking payment as paid:', error);
            addToast('خطأ في تسجيل الدفعة', 'error');
        }
    };

    // قراءة الإشعار
    const handleMarkNotificationAsRead = async (notificationId: string) => {
        try {
            await paymentNotificationsService.markAsRead(notificationId);
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // قراءة جميع الإشعارات
    const handleMarkAllAsRead = async () => {
        try {
            await paymentNotificationsService.markAllAsRead();
            setNotifications([]);
            addToast('تم قراءة جميع الإشعارات', 'success');
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            addToast('خطأ في تحديث الإشعارات', 'error');
        }
    };

    // الحصول على معلومات العميل من الحجز
    const getCustomerInfo = (bookingId: string) => {
        const booking = bookingsMap.get(bookingId);
        if (!booking) return { name: 'غير معروف', phone: '-' };
        
        const customer = customersMap.get(booking.customerId);
        return {
            name: customer?.name || booking.customerName || 'غير معروف',
            phone: customer?.phone || '-',
        };
    };

    // الحصول على معلومات الوحدة
    const getUnitInfo = (bookingId: string) => {
        const booking = bookingsMap.get(bookingId);
        return booking?.unitName || 'غير معروف';
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getDaysUntilDue = (dueDate: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const getStatusBadge = (payment: ScheduledPayment) => {
        const daysUntilDue = getDaysUntilDue(payment.dueDate);
        
        if (payment.status === 'paid') {
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400">مدفوع</span>;
        }
        
        if (payment.status === 'overdue' || daysUntilDue < 0) {
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400">متأخر ({Math.abs(daysUntilDue)} يوم)</span>;
        }
        
        if (daysUntilDue === 0) {
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400">اليوم</span>;
        }
        
        if (daysUntilDue <= 7) {
            return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">خلال {daysUntilDue} يوم</span>;
        }
        
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400">قادم</span>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
        );
    }

    // رسالة توضيحية إذا لم تكن الجداول موجودة
    if (!tablesExist) {
        return (
            <div className="p-6">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-8 text-center">
                    <svg className="w-16 h-16 mx-auto text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-white mb-2">يجب تنفيذ الهجرة أولاً</h2>
                    <p className="text-slate-400 mb-4">
                        لم يتم العثور على جداول نظام الدفعات المجدولة في قاعدة البيانات.
                    </p>
                    <div className="bg-slate-800 rounded-lg p-4 text-left max-w-2xl mx-auto">
                        <p className="text-amber-400 text-sm mb-2">يرجى تنفيذ ملف الهجرة التالي في Supabase:</p>
                        <code className="text-xs text-emerald-400 block overflow-x-auto">
                            supabase-migrations/add-payment-schedule-system.sql
                        </code>
                    </div>
                    <p className="text-slate-500 text-sm mt-4">
                        بعد تنفيذ الهجرة، قم بتحديث الصفحة
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                    >
                        تحديث الصفحة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        جدول الدفعات المستحقة
                    </h1>
                    <p className="text-slate-400 mt-1">متابعة وإدارة الدفعات المجدولة للعملاء</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {availableProjects && availableProjects.length > 1 && (
                        <ProjectSelector
                            projects={availableProjects}
                            activeProject={activeProject}
                            onSelectProject={(project) => setActiveProject(project)}
                        />
                    )}
                    
                    {/* Filter by Booking */}
                    <select
                        value={selectedBookingId || ''}
                        onChange={(e) => setSelectedBookingId(e.target.value || null)}
                        className="input-field w-48"
                    >
                        <option value="">جميع الحجوزات</option>
                        {bookings.filter(b => b.paymentPlanYears).map(b => (
                            <option key={b.id} value={b.id}>
                                {b.customerName} - {b.unitName}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-5 border border-blue-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">دفعات قادمة</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats.totalPending}</p>
                            <p className="text-blue-400 text-sm">{formatCurrency(stats.totalPendingAmount)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-rose-500/20 to-rose-600/10 rounded-xl p-5 border border-rose-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">دفعات متأخرة</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats.totalOverdue}</p>
                            <p className="text-rose-400 text-sm">{formatCurrency(stats.totalOverdueAmount)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl p-5 border border-emerald-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">دفعات مسددة</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats.totalPaid}</p>
                            <p className="text-emerald-400 text-sm">{formatCurrency(stats.totalPaidAmount)}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <div 
                    className={`bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl p-5 border border-amber-500/30 cursor-pointer transition-all hover:scale-105 ${activeTab === 'notifications' ? 'ring-2 ring-amber-500' : ''}`}
                    onClick={() => setActiveTab('notifications')}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-sm">إشعارات جديدة</p>
                            <p className="text-2xl font-bold text-white mt-1">{stats.unreadNotifications}</p>
                            <p className="text-amber-400 text-sm">بانتظار القراءة</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center relative">
                            <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            {stats.unreadNotifications > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                                    {stats.unreadNotifications}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-white/10 pb-2">
                {[
                    { key: 'upcoming', label: 'قادمة', icon: '📅' },
                    { key: 'overdue', label: 'متأخرة', icon: '⚠️' },
                    { key: 'paid', label: 'مدفوعة', icon: '✅' },
                    { key: 'notifications', label: 'الإشعارات', icon: '🔔' },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as any)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            activeTab === tab.key
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        <span className="ml-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'notifications' ? (
                // Notifications List
                <div className="space-y-4">
                    {notifications.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-amber-400 hover:text-amber-300 text-sm"
                            >
                                قراءة الكل
                            </button>
                        </div>
                    )}
                    
                    {notifications.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <p className="text-slate-400">لا توجد إشعارات جديدة</p>
                        </div>
                    ) : (
                        notifications.map((notification) => {
                            const customerInfo = getCustomerInfo(notification.bookingId);
                            return (
                                <div
                                    key={notification.id}
                                    className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-xl p-4 border border-amber-500/20"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">{notification.message}</p>
                                                <div className="mt-2 flex flex-wrap gap-4 text-sm">
                                                    <div className="flex items-center gap-1 text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                        </svg>
                                                        <span>{customerInfo.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                        </svg>
                                                        <span dir="ltr">{customerInfo.phone}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-amber-400 font-bold">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{formatCurrency(notification.amount)}</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-2">
                                                    {formatDate(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleMarkNotificationAsRead(notification.id)}
                                            className="text-slate-400 hover:text-white p-1"
                                            title="قراءة"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                // Payments Table
                <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
                    {filteredPayments.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-slate-400">لا توجد دفعات في هذه الفئة</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-900/50">
                                    <tr>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">رقم الدفعة</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">العميل</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">الهاتف</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">الوحدة</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">تاريخ الاستحقاق</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">المبلغ</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">الحالة</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredPayments.map((payment) => {
                                        const customerInfo = getCustomerInfo(payment.bookingId);
                                        return (
                                            <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-white font-medium">
                                                    #{payment.installmentNumber}
                                                </td>
                                                <td className="px-4 py-3 text-white">
                                                    {customerInfo.name}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400" dir="ltr">
                                                    {customerInfo.phone}
                                                </td>
                                                <td className="px-4 py-3 text-slate-300">
                                                    {getUnitInfo(payment.bookingId)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-300">
                                                    {formatDate(payment.dueDate)}
                                                </td>
                                                <td className="px-4 py-3 text-amber-400 font-bold">
                                                    {formatCurrency(payment.amount)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(payment)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {payment.status !== 'paid' && (
                                                        <button
                                                            onClick={() => handleMarkAsPaid(payment)}
                                                            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                                                        >
                                                            تسجيل دفع
                                                        </button>
                                                    )}
                                                    {payment.status === 'paid' && payment.paidDate && (
                                                        <span className="text-emerald-400 text-sm">
                                                            تم الدفع {formatDate(payment.paidDate)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScheduledPayments;
