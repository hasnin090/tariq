import React, { useState, useEffect } from 'react';
import { Notification, User } from '../../../types';
import { notificationsService, usersService } from '../../../src/services/supabaseService';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { BellIcon, CheckIcon, TrashIcon, KeyIcon, CloseIcon } from '../../shared/Icons';
import logActivity from '../../../utils/activityLogger';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { addToast } = useToast();
  const { currentUser } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsService.getAll();
      
      // فلترة الإشعارات حسب صلاحيات المستخدم
      let filteredData = data;
      if (currentUser?.role === 'Accounting' || currentUser?.role === 'Sales') {
        // المستخدمون غير الإداريين يرون فقط إشعاراتهم الخاصة
        filteredData = data.filter(notification => 
          notification.user_id === currentUser.id
        );
      }
      // Admin يرى جميع الإشعارات
      
      setNotifications(filteredData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      addToast('فشل تحميل الإشعارات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResolvePasswordReset = async () => {
    if (!selectedNotification || !selectedNotification.user_id) return;

    if (!newPassword || newPassword.length < 6) {
      addToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      addToast('كلمات المرور غير متطابقة', 'error');
      return;
    }

    try {
      // Update user's password
      await usersService.update(selectedNotification.user_id, { password: newPassword });

      // Mark notification as resolved
      const currentUserId = localStorage.getItem('auth_user');
      const userId = currentUserId ? JSON.parse(currentUserId).id : '';
      await notificationsService.resolve(selectedNotification.id, userId);

      addToast('تم تغيير كلمة المرور بنجاح', 'success');
      logActivity('Reset Password', `Reset password for user: ${selectedNotification.username}`);
      
      setSelectedNotification(null);
      setNewPassword('');
      setConfirmPassword('');
      loadNotifications();
    } catch (error) {
      console.error('Error resolving notification:', error);
      addToast('فشل تغيير كلمة المرور', 'error');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      loadNotifications();
    } catch (error) {
      console.error('Error marking as read:', error);
      addToast('فشل تحديث الإشعار', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await notificationsService.delete(id);
      addToast('تم حذف الإشعار', 'success');
      loadNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      addToast('فشل حذف الإشعار', 'error');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'password_reset':
        return <KeyIcon className="h-6 w-6 text-amber-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600 dark:text-slate-300">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">الإشعارات</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {unreadCount > 0 ? `لديك ${unreadCount} إشعار غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-2xl shadow-lg border border-white/20 dark:border-white/10 p-12 text-center">
          <BellIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`backdrop-blur-xl bg-white/10 dark:bg-white/5 rounded-xl shadow-lg p-5 border-r-4 border-t border-b border-l border-white/20 dark:border-white/10 transition-all ${
                notification.is_read
                  ? 'border-slate-200 dark:border-slate-700'
                  : 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/10'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-slate-100 font-medium mb-1">
                    {notification.message}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(notification.created_at).toLocaleString('ar-EG')}
                  </p>
                  {notification.resolved_at && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      ✓ تم الحل في {new Date(notification.resolved_at).toLocaleString('ar-EG')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {notification.type === 'password_reset' && !notification.resolved_at && (
                    <button
                      onClick={() => setSelectedNotification(notification)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                      إعادة تعيين كلمة المرور
                    </button>
                  )}
                  
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="وضع علامة مقروء"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(notification.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Reset Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex justify-center items-center p-4" onClick={() => setSelectedNotification(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                إعادة تعيين كلمة المرور
              </h2>
              <button onClick={() => setSelectedNotification(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  <strong>المستخدم:</strong> {selectedNotification.username}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  كلمة المرور الجديدة
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="كلمة المرور الجديدة"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  تأكيد كلمة المرور
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="تأكيد كلمة المرور"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setSelectedNotification(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
              >
                إلغاء
              </button>
              <button
                onClick={handleResolvePasswordReset}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
