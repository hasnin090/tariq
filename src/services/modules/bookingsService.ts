/**
 * Bookings Service - خدمة الحجوزات
 * إدارة حجوزات الوحدات
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { Booking } from '../../../types';

export const bookingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customers(name), units(unit_number)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((booking: any) => ({
      id: booking.id,
      unitId: booking.unit_id,
      unitName: booking.units?.unit_number || '',
      customerId: booking.customer_id,
      customerName: booking.customers?.name || '',
      bookingDate: booking.booking_date,
      amountPaid: booking.amount_paid,
      status: booking.status,
      projectId: booking.project_id,
      unitSaleId: booking.unit_sale_id,
      paymentPlanYears: booking.payment_plan_years,
      paymentFrequencyMonths: booking.payment_frequency_months,
      paymentStartDate: booking.payment_start_date,
      monthlyAmount: booking.monthly_amount,
      installmentAmount: booking.installment_amount,
      totalInstallments: booking.total_installments,
    }));
  },

  async create(booking: Omit<Booking, 'id'>) {
    const id = generateUniqueId('booking');
    
    const dbData = {
      id,
      unit_id: (booking as any).unit_id || booking.unitId,
      customer_id: (booking as any).customer_id || booking.customerId,
      booking_date: (booking as any).booking_date || booking.bookingDate,
      total_price: (booking as any).total_price || (booking as any).totalPrice || 0,
      amount_paid: (booking as any).amount_paid || booking.amountPaid || 0,
      status: booking.status || 'Active',
    };
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([dbData])
      .select('*, customers(name), units(unit_number)');
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        unitId: data[0].unit_id,
        unitName: data[0].units?.unit_number || '',
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || '',
        bookingDate: data[0].booking_date,
        amountPaid: data[0].amount_paid,
        status: data[0].status,
      };
    }
  },

  async update(id: string, booking: Partial<Booking>) {
    const dbData: any = {};
    Object.entries(booking).forEach(([key, value]) => {
      if (key === 'unitId') dbData.unit_id = value;
      else if (key === 'customerId') dbData.customer_id = value;
      else if (key === 'bookingDate') dbData.booking_date = value;
      else if (key === 'amountPaid') dbData.amount_paid = value;
      else if (key !== 'id' && key !== 'unitName' && key !== 'customerName') dbData[key] = value;
    });
    
    const { data, error } = await supabase
      .from('bookings')
      .update(dbData)
      .eq('id', id)
      .select('*, customers(name), units(unit_number)');
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        unitId: data[0].unit_id,
        unitName: data[0].units?.unit_number || '',
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || '',
        bookingDate: data[0].booking_date,
        amountPaid: data[0].amount_paid,
        status: data[0].status,
      };
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getByUnitId(unitId: string) {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customers(name), units(unit_number)')
      .eq('unit_id', unitId);
    if (error) throw error;
    
    return (data || []).map((booking: any) => ({
      id: booking.id,
      unitId: booking.unit_id,
      unitName: booking.units?.unit_number || '',
      customerId: booking.customer_id,
      customerName: booking.customers?.name || '',
      bookingDate: booking.booking_date,
      amountPaid: booking.amount_paid,
      status: booking.status,
    }));
  },

  subscribe(callback: (bookings: Booking[]) => void) {
    const subscription = supabase
      .channel('bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        bookingsService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};
