import React, { useState, useMemo } from 'react';
import { useNotifications } from '../../../hooks/useNotifications';
import { Notification, NotificationType, NotificationPriority } from '../../../utils/notificationService';

// Icons
const BellIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>;
const CheckIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
const TrashIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const RefreshIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const FilterIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>;

const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    checkPayments
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | NotificationType>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | NotificationPriority>('all');

  // تصفية الإشعارات
  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // فلتر حسب النوع
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }

    // فلتر حسب الأولوية
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(n => n.priority === priorityFilter);
    }

    return filtered;
  }, [notifications, filter, priorityFilter]);

  // أيقونة حسب نوع الإشعار
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'payment_due_today':
      case 'payment_due_soon':
        return '⏰';
      case 'payment_overdue':
        return '🚨';
      case 'payment_received':
        return '💰';
      case 'booking_completed':
        return '✅';
      case 'low_balance':
        return '⚠️';
      case 'budget_exceeded':
        return '📊';
      default:
        return '🔔';
    }
  };

  // لون حسب الأولوية
  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // معالج الضغط على إشعار
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BellIcon />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            🔔 مركز الإشعارات
          </h1>
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={loadNotifications}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
            title="تحديث"
          >
            <RefreshIcon />
            تحديث
          </button>
          <button
            onClick={checkPayments}
            className="btn-secondary flex items-center gap-2"
            title="فحص الدفعات"
          >
            <BellIcon />
            فحص الدفعات
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary flex items-center gap-2"
              title="تعليم الكل كمقروء"
            >
              <CheckIcon />
              تعليم الكل كمقروء
            </button>
          )}
          <button
            onClick={deleteAllRead}
            className="btn-secondary flex items-center gap-2"
            title="حذف المقروءة"
          >
            <TrashIcon />
            حذف المقروءة
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <FilterIcon />
            <span className="font-semibold text-slate-700 dark:text-slate-300">الفلاتر:</span>
          </div>

          {/* Type Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="input-field"
          >
            <option value="all">جميع الإشعارات</option>
            <option value="unread">غير المقروءة فقط</option>
            <option value="payment_due_today">مستحقة اليوم</option>
            <option value="payment_due_soon">قادمة قريباً</option>
            <option value="payment_overdue">متأخرة</option>
            <option value="payment_received">دفعات مستلمة</option>
            <option value="booking_completed">حجوزات مكتملة</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="input-field"
          >
            <option value="all">جميع الأولويات</option>
            <option value="urgent">عاجلة</option>
            <option value="high">عالية</option>
            <option value="medium">متوسطة</option>
            <option value="low">منخفضة</option>
          </select>

          <span className="text-sm text-slate-500">
            {filteredNotifications.length} إشعار
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">جاري التحميل...</div>
        </div>
      )}

      {/* Notifications List */}
      {!loading && filteredNotifications.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-12 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
          <BellIcon />
          <p className="text-slate-500 dark:text-slate-400 mt-4">
            لا توجد إشعارات {filter !== 'all' ? 'بهذا الفلتر' : ''}
          </p>
        </div>
      )}

      {!loading && filteredNotifications.length > 0 && (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border cursor-pointer transition-all hover:scale-[1.01] ${
                notification.isRead
                  ? 'border-slate-200 dark:border-slate-700 opacity-70'
                  : 'border-blue-400 dark:border-blue-600 shadow-blue-200 dark:shadow-blue-900/50'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-4xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Title */}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {notification.title}
                      </h3>

                      {/* Message */}
                      <p className="text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-line">
                        {notification.message}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        {/* Priority Badge */}
                        <span
                          className={`px-2 py-1 ${getPriorityColor(notification.priority)} text-white rounded-full`}
                        >
                          {notification.priority === 'urgent' && 'عاجل'}
                          {notification.priority === 'high' && 'عالي'}
                          {notification.priority === 'medium' && 'متوسط'}
                          {notification.priority === 'low' && 'منخفض'}
                        </span>

                        {/* Date */}
                        <span className="text-slate-500">
                          {new Date(notification.createdAt).toLocaleString('ar-SA')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                          title="تعليم كمقروء"
                        >
                          <CheckIcon />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-600"
                        title="حذف"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
