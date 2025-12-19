/**
 * 🔔 Notification Service
 * خدمة الإشعارات التلقائية للدفعات
 */

import { supabase } from '../src/lib/supabase';

export type NotificationType = 
  | 'payment_due_soon'      // دفعة قريبة الاستحقاق
  | 'payment_overdue'       // دفعة متأخرة
  | 'payment_due_today'     // دفعة مستحقة اليوم
  | 'booking_completed'     // حجز مكتمل
  | 'payment_received'      // دفعة مستلمة
  | 'low_balance'           // رصيد منخفض
  | 'budget_exceeded';      // تجاوز الميزانية

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  createdAt: string;
  userId: string;
  projectId?: string;
}

// ==================== Helper Functions ====================

/**
 * حساب عدد الأيام بين تاريخين
 */
const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * تنسيق التاريخ
 */
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * تحديد أولوية الإشعار بناءً على الأيام المتبقية
 */
const getPriority = (daysRemaining: number): NotificationPriority => {
  if (daysRemaining < 0) return 'urgent';      // متأخر
  if (daysRemaining === 0) return 'urgent';    // اليوم
  if (daysRemaining <= 3) return 'high';       // خلال 3 أيام
  if (daysRemaining <= 7) return 'medium';     // خلال أسبوع
  return 'low';                                 // أكثر من أسبوع
};

// ==================== Notification Service ====================

export const notificationService = {
  /**
   * جلب جميع الإشعارات للمستخدم
   */
  async getAll(userId: string, projectId?: string): Promise<Notification[]> {
    let query = supabase
      .from('payment_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []).map(n => ({
      id: n.id,
      type: n.notification_type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.is_read,
      createdAt: n.created_at,
      userId: n.user_id,
      projectId: n.project_id
    }));
  },

  /**
   * جلب عدد الإشعارات غير المقروءة
   */
  async getUnreadCount(userId: string, projectId?: string): Promise<number> {
    let query = supabase
      .from('payment_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    
    return count || 0;
  },

  /**
   * وضع علامة مقروء على إشعار
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
  },

  /**
   * وضع علامة مقروء على كل الإشعارات
   */
  async markAllAsRead(userId: string, projectId?: string): Promise<void> {
    let query = supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { error } = await query;
    
    if (error) throw error;
  },

  /**
   * حذف إشعار
   */
  async delete(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('payment_notifications')
      .delete()
      .eq('id', notificationId);
    
    if (error) throw error;
  },

  /**
   * حذف جميع الإشعارات المقروءة
   */
  async deleteAllRead(userId: string, projectId?: string): Promise<void> {
    let query = supabase
      .from('payment_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { error } = await query;
    
    if (error) throw error;
  },

  /**
   * إنشاء إشعار جديد
   */
  async create(notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
    const { data, error } = await supabase
      .from('payment_notifications')
      .insert({
        notification_type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        user_id: notification.userId,
        project_id: notification.projectId,
        is_read: false
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      type: data.notification_type,
      priority: data.priority,
      title: data.title,
      message: data.message,
      data: data.data,
      isRead: data.is_read,
      createdAt: data.created_at,
      userId: data.user_id,
      projectId: data.project_id
    };
  },

  /**
   * التحقق من الدفعات القادمة وإنشاء إشعارات
   */
  async checkUpcomingPayments(userId: string, projectId: string, daysAhead: number = 7): Promise<Notification[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);
    
    // جلب الدفعات المجدولة القادمة
    const { data: scheduledPayments, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings:booking_id(
          id,
          units:unitId(name),
          customers:customerId(name)
        )
      `)
      .eq('status', 'pending')
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    const notifications: Notification[] = [];
    
    for (const payment of scheduledPayments || []) {
      const daysRemaining = daysBetween(today.toISOString(), payment.due_date);
      const priority = getPriority(daysRemaining);
      
      let type: NotificationType = 'payment_due_soon';
      let title = '';
      let message = '';
      
      if (daysRemaining === 0) {
        type = 'payment_due_today';
        title = '⚠️ دفعة مستحقة اليوم';
        message = `دفعة ${payment.amount} ${payment.currency || 'IQD'} مستحقة اليوم`;
      } else if (daysRemaining === 1) {
        type = 'payment_due_soon';
        title = '🔔 دفعة مستحقة غداً';
        message = `دفعة ${payment.amount} ${payment.currency || 'IQD'} مستحقة غداً`;
      } else {
        type = 'payment_due_soon';
        title = `🔔 دفعة قادمة خلال ${daysRemaining} أيام`;
        message = `دفعة ${payment.amount} ${payment.currency || 'IQD'} مستحقة في ${formatDate(payment.due_date)}`;
      }
      
      // إضافة معلومات الحجز
      if (payment.bookings) {
        const unitName = payment.bookings.units?.name || 'N/A';
        const customerName = payment.bookings.customers?.name || 'N/A';
        message += `\nالعميل: ${customerName} | الوحدة: ${unitName}`;
      }
      
      // التحقق من عدم وجود إشعار مماثل بالفعل
      const { data: existingNotif } = await supabase
        .from('payment_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('data->>scheduled_payment_id', payment.id)
        .eq('is_read', false)
        .single();
      
      if (!existingNotif) {
        const newNotification = await this.create({
          type,
          priority,
          title,
          message,
          data: {
            scheduled_payment_id: payment.id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            due_date: payment.due_date,
            days_remaining: daysRemaining
          },
          userId,
          projectId
        });
        
        notifications.push(newNotification);
      }
    }
    
    return notifications;
  },

  /**
   * التحقق من الدفعات المتأخرة وإنشاء إشعارات
   */
  async checkOverduePayments(userId: string, projectId: string): Promise<Notification[]> {
    const today = new Date().toISOString().split('T')[0];
    
    // جلب الدفعات المتأخرة
    const { data: overduePayments, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings:booking_id(
          id,
          units:unitId(name),
          customers:customerId(name)
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', today)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    
    const notifications: Notification[] = [];
    
    for (const payment of overduePayments || []) {
      const daysOverdue = Math.abs(daysBetween(payment.due_date, today));
      
      const title = `🚨 دفعة متأخرة ${daysOverdue} ${daysOverdue === 1 ? 'يوم' : 'أيام'}`;
      const unitName = payment.bookings?.units?.name || 'N/A';
      const customerName = payment.bookings?.customers?.name || 'N/A';
      const message = `دفعة ${payment.amount} ${payment.currency || 'IQD'} متأخرة منذ ${formatDate(payment.due_date)}\nالعميل: ${customerName} | الوحدة: ${unitName}`;
      
      // التحقق من عدم وجود إشعار مماثل حديث
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { data: existingNotif } = await supabase
        .from('payment_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('data->>scheduled_payment_id', payment.id)
        .eq('notification_type', 'payment_overdue')
        .gte('created_at', oneDayAgo.toISOString())
        .single();
      
      if (!existingNotif) {
        const newNotification = await this.create({
          type: 'payment_overdue',
          priority: 'urgent',
          title,
          message,
          data: {
            scheduled_payment_id: payment.id,
            booking_id: payment.booking_id,
            amount: payment.amount,
            due_date: payment.due_date,
            days_overdue: daysOverdue
          },
          userId,
          projectId
        });
        
        notifications.push(newNotification);
      }
    }
    
    return notifications;
  },

  /**
   * فحص شامل وإنشاء جميع الإشعارات المطلوبة
   */
  async checkAndNotify(userId: string, projectId: string): Promise<{
    upcoming: Notification[];
    overdue: Notification[];
  }> {
    const [upcoming, overdue] = await Promise.all([
      this.checkUpcomingPayments(userId, projectId, 7),
      this.checkOverduePayments(userId, projectId)
    ]);
    
    return { upcoming, overdue };
  }
};
