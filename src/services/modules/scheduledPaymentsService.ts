/**
 * Scheduled Payments Service - خدمة الدفعات المجدولة
 * إدارة جدولة الأقساط والدفعات
 */

import { supabase } from '../core/supabaseClient';
import { ScheduledPayment, PaymentNotification } from '../../../types';

export const scheduledPaymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings (
          unit_id,
          customer_id,
          units (unit_number),
          customers (name, phone)
        )
      `)
      .order('due_date', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((sp: any) => ({
      id: sp.id,
      bookingId: sp.booking_id,
      installmentNumber: sp.installment_number,
      dueDate: sp.due_date,
      amount: sp.amount,
      status: sp.status,
      paidAmount: sp.paid_amount,
      paidDate: sp.paid_date,
      paymentId: sp.payment_id,
      notificationSent: sp.notification_sent,
      notificationSentAt: sp.notification_sent_at,
      notes: sp.notes,
      attachment_id: sp.attachment_id,
      unitName: sp.bookings?.units?.unit_number || '',
      customerName: sp.bookings?.customers?.name || '',
      customerPhone: sp.bookings?.customers?.phone || '',
    }));
  },

  async getByBookingId(bookingId: string) {
    const { data, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings (
          unit_id,
          customer_id,
          units (unit_number),
          customers (name, phone)
        )
      `)
      .eq('booking_id', bookingId)
      .order('installment_number', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((sp: any) => ({
      id: sp.id,
      bookingId: sp.booking_id,
      installmentNumber: sp.installment_number,
      dueDate: sp.due_date,
      amount: sp.amount,
      status: sp.status,
      paidAmount: sp.paid_amount,
      paidDate: sp.paid_date,
      paymentId: sp.payment_id,
      notificationSent: sp.notification_sent,
      notificationSentAt: sp.notification_sent_at,
      notes: sp.notes,
      attachment_id: sp.attachment_id,
      unitName: sp.bookings?.units?.unit_number || '',
      customerName: sp.bookings?.customers?.name || '',
      customerPhone: sp.bookings?.customers?.phone || '',
    }));
  },

  async getByBookingIds(bookingIds: string[]) {
    if (!bookingIds.length) return [] as ScheduledPayment[];

    const { data, error } = await supabase
      .from('scheduled_payments')
      .select('*')
      .in('booking_id', bookingIds)
      .order('booking_id', { ascending: true })
      .order('installment_number', { ascending: true });
    if (error) throw error;

    return (data || []).map((sp: any) => ({
      id: sp.id,
      bookingId: sp.booking_id,
      installmentNumber: sp.installment_number,
      dueDate: sp.due_date,
      amount: sp.amount,
      status: sp.status,
      paidAmount: sp.paid_amount,
      paidDate: sp.paid_date,
      paymentId: sp.payment_id,
      notificationSent: sp.notification_sent,
      notificationSentAt: sp.notification_sent_at,
      notes: sp.notes,
      attachment_id: sp.attachment_id,
      unitName: '',
      customerName: '',
      customerPhone: '',
    }));
  },

  async getUpcoming(daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const { data, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings (
          unit_id,
          customer_id,
          units (unit_number),
          customers (name, phone, email)
        )
      `)
      .in('status', ['pending', 'overdue', 'partially_paid'])
      .lte('due_date', futureDate.toISOString().split('T')[0])
      .order('due_date', { ascending: true });
    if (error) throw error;
    
    const today = new Date().toISOString().split('T')[0];
    
    return (data || []).map((sp: any) => {
      const dueDate = sp.due_date;
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
      
      let urgency: 'متأخرة' | 'اليوم' | 'قريباً' | 'مجدولة' = 'مجدولة';
      if (daysUntilDue < 0) urgency = 'متأخرة';
      else if (daysUntilDue === 0) urgency = 'اليوم';
      else if (daysUntilDue <= 7) urgency = 'قريباً';
      
      return {
        id: sp.id,
        bookingId: sp.booking_id,
        installmentNumber: sp.installment_number,
        dueDate: sp.due_date,
        amount: sp.amount,
        status: sp.status,
        paidAmount: sp.paid_amount,
        paidDate: sp.paid_date,
        paymentId: sp.payment_id,
        notificationSent: sp.notification_sent,
        attachment_id: sp.attachment_id,
        unitName: sp.bookings?.units?.unit_number || '',
        customerName: sp.bookings?.customers?.name || '',
        customerPhone: sp.bookings?.customers?.phone || '',
        daysUntilDue,
        urgency,
      };
    });
  },

  async update(id: string, data: Partial<ScheduledPayment>) {
    const dbData: any = {};
    if (data.status) dbData.status = data.status;
    if (data.paidAmount !== undefined) dbData.paid_amount = data.paidAmount;
    if (data.paidDate) dbData.paid_date = data.paidDate;
    if (data.paymentId) dbData.payment_id = data.paymentId;
    if (data.notificationSent !== undefined) dbData.notification_sent = data.notificationSent;
    if (data.notes !== undefined) dbData.notes = data.notes;
    if (data.attachment_id !== undefined) dbData.attachment_id = data.attachment_id;
    dbData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('scheduled_payments')
      .update(dbData)
      .eq('id', id);
    if (error) throw error;
  },

  async linkPayment(scheduledPaymentId: string, paymentId: string, amount: number) {
    const { data: sp, error: fetchError } = await supabase
      .from('scheduled_payments')
      .select('*')
      .eq('id', scheduledPaymentId)
      .single();
    if (fetchError) throw fetchError;
    
    const newPaidAmount = (sp.paid_amount || 0) + amount;
    const newStatus = newPaidAmount >= sp.amount ? 'paid' : 'partially_paid';
    
    const { error } = await supabase
      .from('scheduled_payments')
      .update({
        status: newStatus,
        paid_amount: newPaidAmount,
        paid_date: new Date().toISOString().split('T')[0],
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduledPaymentId);
    if (error) throw error;
  },

  async unlinkPayment(paymentId: string) {
    const { data: linkedScheduled, error: fetchError } = await supabase
      .from('scheduled_payments')
      .select('*')
      .eq('payment_id', paymentId);
    
    if (fetchError) {
      console.warn('Error fetching linked scheduled payments:', fetchError);
      return;
    }
    
    if (!linkedScheduled || linkedScheduled.length === 0) return;
    
    for (const sp of linkedScheduled) {
      const today = new Date().toISOString().split('T')[0];
      const dueDate = sp.due_date;
      
      let newStatus: 'pending' | 'overdue' = 'pending';
      if (dueDate && new Date(dueDate) < new Date(today)) {
        newStatus = 'overdue';
      }
      
      const { error: updateError } = await supabase
        .from('scheduled_payments')
        .update({
          status: newStatus,
          paid_amount: 0,
          paid_date: null,
          payment_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sp.id);
      
      if (updateError) {
        console.warn('Error unlinking scheduled payment:', updateError);
      }
    }
  },

  async generateForBooking(
    bookingId: string,
    unitPrice: number,
    paymentPlanYears: 4 | 5,
    paymentFrequencyMonths: 1 | 2 | 3 | 4 | 5 | 6 | 12,
    startDate: string
  ) {
    const totalMonths = paymentPlanYears * 12;
    const monthlyAmount = Math.round((unitPrice / totalMonths) * 100) / 100;
    const installmentAmount = Math.round((monthlyAmount * paymentFrequencyMonths) * 100) / 100;
    const totalInstallments = Math.ceil(totalMonths / paymentFrequencyMonths);
    
    await supabase
      .from('scheduled_payments')
      .delete()
      .eq('booking_id', bookingId);
    
    const scheduledPayments = [];
    let currentDate = new Date(startDate);
    let totalScheduled = 0;
    
    for (let i = 1; i <= totalInstallments; i++) {
      let amount = installmentAmount;
      if (i === totalInstallments) {
        amount = unitPrice - totalScheduled;
      }
      totalScheduled += amount;
      
      scheduledPayments.push({
        id: `sched_${bookingId}_${i}_${Date.now()}`,
        booking_id: bookingId,
        installment_number: i,
        due_date: currentDate.toISOString().split('T')[0],
        amount: Math.round(amount * 100) / 100,
        status: 'pending',
        paid_amount: 0,
        notification_sent: false,
      });
      
      currentDate.setMonth(currentDate.getMonth() + paymentFrequencyMonths);
    }
    
    const { error } = await supabase
      .from('scheduled_payments')
      .insert(scheduledPayments);
    if (error) throw error;
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_plan_years: paymentPlanYears,
        payment_frequency_months: paymentFrequencyMonths,
        payment_start_date: startDate,
        monthly_amount: monthlyAmount,
        installment_amount: installmentAmount,
        total_installments: totalInstallments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);
    if (updateError) throw updateError;
    
    return {
      totalInstallments,
      monthlyAmount,
      installmentAmount,
      scheduledPayments,
    };
  },

  async deleteByBookingId(bookingId: string) {
    const { error } = await supabase
      .from('scheduled_payments')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },
};

// ==================== Payment Notifications Service ====================
export const paymentNotificationsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('payment_notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((n: any) => ({
      id: n.id,
      scheduledPaymentId: n.scheduled_payment_id,
      bookingId: n.booking_id,
      customerName: n.customer_name,
      customerPhone: n.customer_phone,
      unitName: n.unit_name,
      amountDue: n.amount_due,
      dueDate: n.due_date,
      notificationType: n.notification_type,
      isRead: n.is_read,
      userId: n.user_id,
      createdAt: n.created_at,
    }));
  },

  async getUnread(userId?: string) {
    let query = supabase
      .from('payment_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map((n: any) => ({
      id: n.id,
      scheduledPaymentId: n.scheduled_payment_id,
      bookingId: n.booking_id,
      customerName: n.customer_name,
      customerPhone: n.customer_phone,
      unitName: n.unit_name,
      amountDue: n.amount_due,
      dueDate: n.due_date,
      notificationType: n.notification_type,
      isRead: n.is_read,
      userId: n.user_id,
      createdAt: n.created_at,
    }));
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async markAllAsRead(userId?: string) {
    let query = supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    const { error } = await query;
    if (error) throw error;
  },

  async create(notification: Omit<PaymentNotification, 'id' | 'createdAt'>) {
    const id = `pnotif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const { error } = await supabase
      .from('payment_notifications')
      .insert([{
        id,
        scheduled_payment_id: notification.scheduledPaymentId,
        booking_id: notification.bookingId,
        customer_name: notification.customerName,
        customer_phone: notification.customerPhone,
        unit_name: notification.unitName,
        amount_due: notification.amountDue,
        due_date: notification.dueDate,
        notification_type: notification.notificationType,
        is_read: false,
        user_id: notification.userId || null,
      }]);
    if (error) throw error;
    
    return id;
  },

  async checkAndCreateNotifications() {
    const { data: scheduledPayments, error } = await supabase
      .from('scheduled_payments')
      .select(`
        *,
        bookings (
          unit_id,
          customer_id,
          units (name, unit_number),
          customers (name, phone)
        )
      `)
      .in('status', ['pending', 'overdue'])
      .eq('notification_sent', false)
      .lte('due_date', new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    
    if (error) throw error;
    
    const today = new Date().toISOString().split('T')[0];
    let createdCount = 0;
    
    for (const sp of (scheduledPayments || [])) {
      const dueDate = sp.due_date;
      let notificationType: 'reminder' | 'due_today' | 'overdue' = 'reminder';
      
      if (dueDate < today) notificationType = 'overdue';
      else if (dueDate === today) notificationType = 'due_today';
      
      await this.create({
        scheduledPaymentId: sp.id,
        bookingId: sp.booking_id,
        customerName: sp.bookings?.customers?.name || 'غير معروف',
        customerPhone: sp.bookings?.customers?.phone || '',
        unitName: sp.bookings?.units?.unit_number || sp.bookings?.units?.name || '',
        amountDue: sp.amount,
        dueDate: sp.due_date,
        notificationType,
        isRead: false,
      });
      
      await supabase
        .from('scheduled_payments')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', sp.id);
      
      createdCount++;
    }
    
    await supabase
      .from('scheduled_payments')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('due_date', today);
    
    return createdCount;
  },
};
