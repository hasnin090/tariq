/**
 * 🔍 خدمة بحث بسيطة وفعالة
 * 
 * الآلية:
 * 1. البحث يتم مباشرة في Supabase باستخدام ilike
 * 2. لا حدود على عدد النتائج - البحث يجد كل المطابقات
 * 3. النتائج تشمل معلومات المشروع للتنقل الصحيح
 */

import { supabase } from '../lib/supabase';

export interface SimpleSearchResult {
  id: string;
  type: 'expense' | 'payment' | 'booking' | 'customer' | 'unit';
  title: string;
  subtitle: string;
  amount?: number;
  date?: string;
  projectId?: string;
  projectName?: string;
  rawData?: any;
}

/**
 * 🔍 البحث الموحد البسيط
 */
export async function simpleSearch(
  query: string,
  types: Array<'expense' | 'payment' | 'booking' | 'customer' | 'unit'> = ['expense'],
  projectId?: string | null
): Promise<SimpleSearchResult[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  // هذا النظام مطلوب أن يكون البحث فيه حسب المشروع فقط
  if (!projectId) {
    return [];
  }

  const searchTerm = query.trim();
  const results: SimpleSearchResult[] = [];

  try {
    // البحث بالتوازي في جميع الأنواع المطلوبة
    const promises: Promise<void>[] = [];

    if (types.includes('expense')) {
      promises.push(searchExpensesSimple(searchTerm, projectId, results));
    }
    if (types.includes('payment')) {
      promises.push(searchPaymentsSimple(searchTerm, projectId, results));
    }
    if (types.includes('booking')) {
      promises.push(searchBookingsSimple(searchTerm, projectId, results));
    }
    if (types.includes('customer')) {
      promises.push(searchCustomersSimple(searchTerm, results));
    }
    if (types.includes('unit')) {
      promises.push(searchUnitsSimple(searchTerm, projectId, results));
    }

    await Promise.all(promises);

    // ترتيب النتائج حسب التطابق
    return results.sort((a, b) => {
      const aMatch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
      const bMatch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) ? 1 : 0;
      return bMatch - aMatch;
    });

  } catch (error) {
    console.error('Simple search error:', error);
    return [];
  }
}

/**
 * البحث في المصروفات
 */
async function searchExpensesSimple(
  searchTerm: string,
  projectId: string | null | undefined,
  results: SimpleSearchResult[]
): Promise<void> {
  // بحث مباشر في قاعدة البيانات داخل المصروفات
  // ملاحظة: نتجنب أي join غير مضمون (مثل projects(name)) حتى لا يفشل الاستعلام
  let query = supabase
    .from('expenses')
    .select(`
      id,
      description,
      amount,
      expense_date,
      project_id,
      category_id,
      expense_categories(name)
    `)
    .ilike('description', `%${searchTerm}%`)
    .order('expense_date', { ascending: false })
    .limit(50);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Search expenses error:', error);
    return;
  }

  for (const expense of data) {
    const categoryName = (expense.expense_categories as any)?.name;
    results.push({
      id: expense.id,
      type: 'expense',
      title: expense.description || 'بدون وصف',
      subtitle: `${categoryName || 'بدون فئة'} • ${expense.expense_date}`,
      amount: expense.amount,
      date: expense.expense_date,
      projectId: expense.project_id,
      projectName: undefined,
      rawData: expense,
    });
  }
}

/**
 * البحث في الدفعات
 */
async function searchPaymentsSimple(
  searchTerm: string,
  projectId: string | null | undefined,
  results: SimpleSearchResult[]
): Promise<void> {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id,
      amount,
      date,
      notes,
      bookings(
        customers(name),
        units(unit_number, project_id, projects(name))
      )
    `)
    .or(`notes.ilike.%${searchTerm}%`)
    .order('date', { ascending: false })
    .limit(50);

  if (error || !data) {
    console.error('Search payments error:', error);
    return;
  }

  for (const payment of data as any[]) {
    const customerName = payment.bookings?.customers?.name;
    const unitNumber = payment.bookings?.units?.unit_number;
    const paymentProjectId = payment.bookings?.units?.project_id;
    const paymentProjectName = payment.bookings?.units?.projects?.name;

    // فلتر حسب المشروع إذا محدد
    if (projectId && paymentProjectId !== projectId) continue;

    // البحث في اسم العميل أو الوحدة
    const matchesCustomer = customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnit = unitNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNotes = payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    if (matchesCustomer || matchesUnit || matchesNotes) {
      results.push({
        id: payment.id,
        type: 'payment',
        title: `دفعة من ${customerName || 'غير محدد'}`,
        subtitle: `${unitNumber || ''} • ${paymentProjectName || ''} • ${payment.date}`,
        amount: payment.amount,
        date: payment.date,
        projectId: paymentProjectId,
        projectName: paymentProjectName,
        rawData: payment,
      });
    }
  }
}

/**
 * البحث في الحجوزات
 */
async function searchBookingsSimple(
  searchTerm: string,
  projectId: string | null | undefined,
  results: SimpleSearchResult[]
): Promise<void> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      total_price,
      created_at,
      status,
      customers(name),
      units(unit_number, project_id, projects(name))
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    console.error('Search bookings error:', error);
    return;
  }

  const searchLower = searchTerm.toLowerCase();

  for (const booking of data as any[]) {
    const customerName = booking.customers?.name;
    const unitNumber = booking.units?.unit_number;
    const bookingProjectId = booking.units?.project_id;
    const bookingProjectName = booking.units?.projects?.name;

    // فلتر حسب المشروع إذا محدد
    if (projectId && bookingProjectId !== projectId) continue;

    // البحث
    if (customerName?.toLowerCase().includes(searchLower) || 
        unitNumber?.toLowerCase().includes(searchLower)) {
      results.push({
        id: booking.id,
        type: 'booking',
        title: `حجز ${unitNumber || ''} - ${customerName || ''}`,
        subtitle: `${bookingProjectName || ''} • ${booking.status} • ${booking.created_at?.split('T')[0]}`,
        amount: booking.total_price,
        date: booking.created_at,
        projectId: bookingProjectId,
        projectName: bookingProjectName,
        rawData: booking,
      });
    }
  }
}

/**
 * البحث في العملاء
 */
async function searchCustomersSimple(
  searchTerm: string,
  results: SimpleSearchResult[]
): Promise<void> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, email')
    .ilike('name', `%${searchTerm}%`)
    .limit(30);

  if (error || !data) return;

  for (const customer of data) {
    results.push({
      id: customer.id,
      type: 'customer',
      title: customer.name,
      subtitle: customer.phone || customer.email || '',
      rawData: customer,
    });
  }
}

/**
 * البحث في الوحدات
 */
async function searchUnitsSimple(
  searchTerm: string,
  projectId: string | null | undefined,
  results: SimpleSearchResult[]
): Promise<void> {
  let query = supabase
    .from('units')
    .select('id, unit_number, status, price, project_id, projects(name)')
    .ilike('unit_number', `%${searchTerm}%`)
    .limit(30);

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;

  if (error || !data) return;

  for (const unit of data as any[]) {
    results.push({
      id: unit.id,
      type: 'unit',
      title: unit.unit_number,
      subtitle: `${unit.projects?.name || ''} • ${unit.status}`,
      amount: unit.price,
      projectId: unit.project_id,
      projectName: unit.projects?.name,
      rawData: unit,
    });
  }
}
