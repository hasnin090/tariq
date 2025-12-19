/**
 * 🔔 useNotifications Hook
 * React Hook لإدارة الإشعارات
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { notificationService, type Notification } from '../utils/notificationService';

export const useNotifications = () => {
  const { currentUser } = useAuth();
  const { currentProject } = useProject();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * تحميل الإشعارات
   */
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await notificationService.getAll(
        currentUser.id,
        currentProject?.id
      );
      setNotifications(data);
      
      const count = data.filter(n => !n.isRead).length;
      setUnreadCount(count);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الإشعارات');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentProject]);

  /**
   * وضع علامة مقروء على إشعار
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الإشعار');
    }
  }, []);

  /**
   * وضع علامة مقروء على كل الإشعارات
   */
  const markAllAsRead = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      await notificationService.markAllAsRead(
        currentUser.id,
        currentProject?.id
      );
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (err: any) {
      setError(err.message || 'فشل تحديث الإشعارات');
    }
  }, [currentUser, currentProject]);

  /**
   * حذف إشعار
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationService.delete(notificationId);
      
      const notification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );
      
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      setError(err.message || 'فشل حذف الإشعار');
    }
  }, [notifications]);

  /**
   * حذف جميع الإشعارات المقروءة
   */
  const deleteAllRead = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      await notificationService.deleteAllRead(
        currentUser.id,
        currentProject?.id
      );
      
      setNotifications(prev =>
        prev.filter(n => !n.isRead)
      );
    } catch (err: any) {
      setError(err.message || 'فشل حذف الإشعارات');
    }
  }, [currentUser, currentProject]);

  /**
   * التحقق من الدفعات وإنشاء إشعارات
   */
  const checkPayments = useCallback(async () => {
    if (!currentUser || !currentProject) return;
    
    try {
      await notificationService.checkAndNotify(
        currentUser.id,
        currentProject.id
      );
      
      // إعادة تحميل الإشعارات
      await loadNotifications();
    } catch (err: any) {
      setError(err.message || 'فشل فحص الدفعات');
    }
  }, [currentUser, currentProject, loadNotifications]);

  /**
   * تحميل تلقائي عند التهيئة
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * تحديث دوري (كل 5 دقائق)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications();
      checkPayments();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [loadNotifications, checkPayments]);

  return {
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
  };
};
