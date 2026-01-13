/**
 * Payments Service - خدمة المدفوعات
 * إدارة الدفعات والأقساط
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { Payment, ExtraPayment, PaymentAttachment } from '../../../types';

export const paymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        bookings (
          id,
          customer_id,
          unit_id,
          project_id,
          customers (name, phone),
          units (unit_number, name),
          projects (name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((p: any) => ({
      id: p.id,
      bookingId: p.booking_id,
      amount: p.amount,
      paymentDate: p.payment_date,
      paymentType: p.payment_type,
      receiptNumber: p.receipt_number,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
      scheduledPaymentId: p.scheduled_payment_id,
      projectId: p.bookings?.project_id || null,
      projectName: p.bookings?.projects?.name || '',
      customerName: p.bookings?.customers?.name || '',
      customerPhone: p.bookings?.customers?.phone || '',
      unitName: p.bookings?.units?.unit_number || p.bookings?.units?.name || '',
    }));
  },

  async getByBookingId(bookingId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('payment_date', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((p: any) => ({
      id: p.id,
      bookingId: p.booking_id,
      amount: p.amount,
      paymentDate: p.payment_date,
      paymentType: p.payment_type,
      receiptNumber: p.receipt_number,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
      scheduledPaymentId: p.scheduled_payment_id,
    }));
  },

  async getByBookingIds(bookingIds: string[]) {
    if (!bookingIds.length) return [] as Payment[];

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .in('booking_id', bookingIds)
      .order('payment_date', { ascending: true });
    if (error) throw error;

    return (data || []).map((p: any) => ({
      id: p.id,
      bookingId: p.booking_id,
      amount: p.amount,
      paymentDate: p.payment_date,
      paymentType: p.payment_type,
      receiptNumber: p.receipt_number,
      notes: p.notes,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      createdBy: p.created_by,
      scheduledPaymentId: p.scheduled_payment_id,
    }));
  },

  async create(payment: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = generateUniqueId('pay');
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('payments')
      .insert([{
        id,
        booking_id: payment.bookingId,
        amount: payment.amount,
        payment_date: payment.paymentDate,
        payment_type: payment.paymentType,
        receipt_number: payment.receiptNumber || null,
        notes: payment.notes || null,
        created_at: now,
        updated_at: now,
        created_by: payment.createdBy || null,
        scheduled_payment_id: payment.scheduledPaymentId || null,
      }]);
    if (error) throw error;
    return id;
  },

  async update(id: string, payment: Partial<Omit<Payment, 'id' | 'createdAt'>>) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (payment.amount !== undefined) updateData.amount = payment.amount;
    if (payment.paymentDate !== undefined) updateData.payment_date = payment.paymentDate;
    if (payment.paymentType !== undefined) updateData.payment_type = payment.paymentType;
    if (payment.receiptNumber !== undefined) updateData.receipt_number = payment.receiptNumber;
    if (payment.notes !== undefined) updateData.notes = payment.notes;
    
    const { error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteByBookingId(bookingId: string) {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },
  
  async getStatsByBooking(bookingId: string) {
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', bookingId);
    if (error) throw error;
    
    const totalPaid = (payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    return {
      totalPaid,
      paymentCount: (payments || []).length,
    };
  },
};

// ==================== Extra Payments Service ====================
export const extraPaymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('extra_payments')
      .select(`
        *,
        bookings (
          id,
          customer_id,
          unit_id,
          project_id,
          customers (name, phone),
          units (unit_number, name),
          projects (name)
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((ep: any) => ({
      id: ep.id,
      bookingId: ep.booking_id,
      amount: ep.amount,
      paymentDate: ep.payment_date,
      paymentType: ep.payment_type,
      description: ep.description,
      notes: ep.notes,
      createdAt: ep.created_at,
      updatedAt: ep.updated_at,
      createdBy: ep.created_by,
      projectId: ep.bookings?.project_id || null,
      projectName: ep.bookings?.projects?.name || '',
      customerName: ep.bookings?.customers?.name || '',
      customerPhone: ep.bookings?.customers?.phone || '',
      unitName: ep.bookings?.units?.unit_number || ep.bookings?.units?.name || '',
    }));
  },

  async getByBookingId(bookingId: string) {
    const { data, error } = await supabase
      .from('extra_payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('payment_date', { ascending: true });
    if (error) throw error;
    
    return (data || []).map((ep: any) => ({
      id: ep.id,
      bookingId: ep.booking_id,
      amount: ep.amount,
      paymentDate: ep.payment_date,
      paymentType: ep.payment_type,
      description: ep.description,
      notes: ep.notes,
      createdAt: ep.created_at,
      updatedAt: ep.updated_at,
      createdBy: ep.created_by,
    }));
  },

  async getByBookingIds(bookingIds: string[]) {
    if (!bookingIds.length) return [] as ExtraPayment[];

    const { data, error } = await supabase
      .from('extra_payments')
      .select('*')
      .in('booking_id', bookingIds)
      .order('payment_date', { ascending: true });
    if (error) throw error;

    return (data || []).map((ep: any) => ({
      id: ep.id,
      bookingId: ep.booking_id,
      amount: ep.amount,
      paymentDate: ep.payment_date,
      paymentType: ep.payment_type,
      description: ep.description,
      notes: ep.notes,
      createdAt: ep.created_at,
      updatedAt: ep.updated_at,
      createdBy: ep.created_by,
    }));
  },

  async create(extraPayment: Omit<ExtraPayment, 'id' | 'createdAt' | 'updatedAt'>) {
    const id = `ep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('extra_payments')
      .insert([{
        id,
        booking_id: extraPayment.bookingId,
        amount: extraPayment.amount,
        payment_date: extraPayment.paymentDate,
        payment_type: extraPayment.paymentType,
        description: extraPayment.description || null,
        notes: extraPayment.notes || null,
        created_at: now,
        updated_at: now,
        created_by: extraPayment.createdBy || null,
      }]);
    if (error) throw error;
    return id;
  },

  async update(id: string, extraPayment: Partial<Omit<ExtraPayment, 'id' | 'createdAt'>>) {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (extraPayment.amount !== undefined) updateData.amount = extraPayment.amount;
    if (extraPayment.paymentDate !== undefined) updateData.payment_date = extraPayment.paymentDate;
    if (extraPayment.paymentType !== undefined) updateData.payment_type = extraPayment.paymentType;
    if (extraPayment.description !== undefined) updateData.description = extraPayment.description;
    if (extraPayment.notes !== undefined) updateData.notes = extraPayment.notes;
    
    const { error } = await supabase
      .from('extra_payments')
      .update(updateData)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('extra_payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteByBookingId(bookingId: string) {
    const { error } = await supabase
      .from('extra_payments')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },
};

// ==================== Payment Attachments Service ====================
export const paymentAttachmentsService = {
  async getByPaymentId(paymentId: string) {
    const { data, error } = await supabase
      .from('payment_attachments')
      .select('*')
      .eq('payment_id', paymentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((a: any) => ({
      id: a.id,
      paymentId: a.payment_id,
      fileName: a.file_name,
      fileUrl: a.file_url,
      fileSize: a.file_size,
      fileType: a.file_type,
      uploadedBy: a.uploaded_by,
      createdAt: a.created_at,
    }));
  },

  async getByScheduledPaymentId(scheduledPaymentId: string) {
    const { data: scheduledPayment, error: spError } = await supabase
      .from('scheduled_payments')
      .select('attachment_id')
      .eq('id', scheduledPaymentId)
      .single();
    
    if (spError || !scheduledPayment?.attachment_id) return [];
    
    const { data, error } = await supabase
      .from('payment_attachments')
      .select('*')
      .eq('id', scheduledPayment.attachment_id);
    if (error) throw error;
    
    return (data || []).map((a: any) => ({
      id: a.id,
      paymentId: a.payment_id,
      fileName: a.file_name,
      fileUrl: a.file_url,
      fileSize: a.file_size,
      fileType: a.file_type,
      uploadedBy: a.uploaded_by,
      createdAt: a.created_at,
    }));
  },

  async create(attachment: Omit<PaymentAttachment, 'id' | 'createdAt'>) {
    const id = `patt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('payment_attachments')
      .insert([{
        id,
        payment_id: attachment.paymentId || null,
        file_name: attachment.fileName,
        file_url: attachment.fileUrl,
        file_size: attachment.fileSize || null,
        file_type: attachment.fileType || null,
        uploaded_by: attachment.uploadedBy || null,
        created_at: now,
      }]);
    if (error) throw error;
    return id;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('payment_attachments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteByPaymentId(paymentId: string) {
    const { error } = await supabase
      .from('payment_attachments')
      .delete()
      .eq('payment_id', paymentId);
    if (error) throw error;
  },
};
