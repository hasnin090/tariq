import { supabase } from '../lib/supabase';
import { Customer, Unit, Booking, Payment, Expense, Transaction, Employee, UnitSaleRecord, Project, Vendor, ExpenseCategory, Account, User, UnitType, UnitStatus, Document } from '../../types';
import { hashPassword } from '../../utils/passwordUtils';
import { 
  validateEmail, 
  validateUsername, 
  validateName, 
  validatePhone, 
  validateAmount, 
  validateDate,
  validateText,
  validatePassword,
  sanitizeText,
  ValidationError 
} from '../../utils/validation';
// ✅ استيراد دوال توليد المعرّفات من الملف الموحد
import { generateUniqueId, generateUUID } from '../../utils/uuid';

/**
 * HELPER: Compare two numbers with epsilon tolerance
 * ✅ تم إضافتها لتجنب تكرار الكود
 */
const nearlyEqual = (a: number, b: number, epsilon: number = 0.01): boolean => 
  Math.abs(a - b) < epsilon;

/**
 * USERS SERVICE
 */
// Helper function to add default permissions based on role
const addPermissionsToUser = (user: any) => {
  if (!user) return user;
  
  // If user already has permissions, return as is
  if (user.permissions) return user;
  
  // Set default permissions based on role
  const defaultPermissions = user.role === 'Admin' 
    ? { canView: true, canEdit: true, canDelete: true }
    : { canView: true, canEdit: false, canDelete: false };
  
  return { ...user, permissions: defaultPermissions };
};

export const usersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(addPermissionsToUser);
  },

  async getById(id: string) {
    // ✅ تم إصلاح تسريب المعلومات - استبعاد كلمة المرور
    const { data, error } = await supabase
      .from('users')
      .select('id, name, username, email, role, created_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return addPermissionsToUser(data);
  },

  async create(user: Omit<User, 'id'>) {
    // Validation
    const nameValidation = validateName(user.name);
    if (!nameValidation.valid) throw new ValidationError(nameValidation.error!);
    
    const usernameValidation = validateUsername(user.username);
    if (!usernameValidation.valid) throw new ValidationError(usernameValidation.error!);
    
    if (user.email) {
      const emailValidation = validateEmail(user.email);
      if (!emailValidation.valid) throw new ValidationError(emailValidation.error!);
    }
    
    // Generate UUID for user (users table uses UUID type)
    const id = generateUUID();
    
    // Extract fields
    const { password, projectAssignments, permissions, ...userWithoutPassword } = user as any;
    
    // التحقق من وجود كلمة مرور - لا يوجد كلمة مرور افتراضية لأسباب أمنية
    if (!password) {
      throw new ValidationError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
    }
    
    // التحقق من قوة كلمة المرور
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.error!);
    }
    
    // Hash password before storing
    const hashedPassword = await hashPassword(password);
    
    // Only include valid database columns (permissions is not stored in DB, derived from role)
    const cleanUserData = {
      name: sanitizeText(userWithoutPassword.name),
      username: sanitizeText(userWithoutPassword.username),
      email: userWithoutPassword.email ? sanitizeText(userWithoutPassword.email) : null,
      role: userWithoutPassword.role,
      password: hashedPassword
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...cleanUserData, id }])
      .select('id, name, username, email, role')
      .single();
    
    if (error) {
      // Handle duplicate username error
      if (error.code === '23505' && error.message.includes('users_username_key')) {
        throw new Error('اسم المستخدم مستخدم بالفعل. الرجاء اختيار اسم مختلف.');
      }
      
      throw error;
    }
    
    // Add permissions based on role for the returned data
    return {
      ...data,
      permissions: permissions || { canView: true, canEdit: false, canDelete: false }
    };
  },

  async createPasswordResetNotification(username: string) {
    // Find user by username
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('username', username)
      .single();
    
    if (userError || !users) {
      throw new Error('اسم المستخدم غير موجود');
    }

    // Create notification
    const notificationId = generateUniqueId('notification');
    const { error } = await supabase
      .from('notifications')
      .insert([{
        id: notificationId,
        type: 'password_reset',
        user_id: users.id,
        username: username,
        message: `طلب استعادة كلمة المرور من المستخدم: ${users.name} (@${username})`
      }]);
    
    if (error) throw error;
  },

  async update(id: string, user: Partial<User>) {
    // Extract fields
    const { password, permissions, projectAssignments, ...userWithoutPassword } = user as any;
    
    // Build update data (include hashed password if provided)
    const updateData: any = { ...userWithoutPassword };
    if (password && password.trim()) {
      updateData.password = await hashPassword(password);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, username, email, role')
      .single();
    
    if (error) throw error;
    
    // Add permissions (either from input or auto-generated from role)
    return addPermissionsToUser({
      ...data,
      permissions: permissions
    });
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * NOTIFICATIONS SERVICE
 */
export const notificationsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getUnread() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async markAsRead(id: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async resolve(id: string, resolvedBy: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy
      })
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

/**
 * CUSTOMERS SERVICE
 */
export const customersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(customer => ({
      ...customer,
      projectId: customer.project_id,
    }));
  },

  async create(customer: Omit<Customer, 'id'>) {
    // Validation
    const nameValidation = validateName(customer.name);
    if (!nameValidation.valid) throw new ValidationError(nameValidation.error!);
    
    const phoneValidation = validatePhone(customer.phone);
    if (!phoneValidation.valid) throw new ValidationError(phoneValidation.error!);
    
    if (customer.email) {
      const emailValidation = validateEmail(customer.email);
      if (!emailValidation.valid) throw new ValidationError(emailValidation.error!);
    }
    
    const id = generateUniqueId('customer');
    
    // Convert camelCase to snake_case for database with sanitization
    const dbCustomer: any = {
      ...customer,
      id,
      name: sanitizeText(customer.name),
      phone: sanitizeText(customer.phone),
      email: customer.email ? sanitizeText(customer.email) : null,
      project_id: customer.projectId || null,
    };
    
    // Remove camelCase field
    delete dbCustomer.projectId;
    
    const { data, error } = await supabase
      .from('customers')
      .insert([dbCustomer])
      .select();
    if (error) throw error;
    
    // Map back to camelCase
    const result = data?.[0];
    return result ? {
      ...result,
      projectId: result.project_id,
    } : result;
  },

  async update(id: string, customer: Partial<Customer>) {
    // Convert camelCase to snake_case for database
    const dbCustomer: any = { ...customer };
    
    if ('projectId' in customer) {
      dbCustomer.project_id = customer.projectId || null;
      delete dbCustomer.projectId;
    }
    
    const { data, error } = await supabase
      .from('customers')
      .update(dbCustomer)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    // Map back to camelCase
    const result = data?.[0];
    return result ? {
      ...result,
      projectId: result.project_id,
    } : result;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  subscribe(callback: (customers: Customer[]) => void) {
    const subscription = supabase
      .channel('customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        customersService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * UNITS SERVICE
 */
export const unitsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        customers:customer_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Transform snake_case to camelCase
    return (data || []).map((unit: any) => ({
      id: unit.id,
      name: unit.unit_number,
      type: unit.type,
      status: unit.status,
      price: unit.price,
      customerId: unit.customer_id,
      customerName: unit.customers?.name || null,
      projectId: unit.project_id,
    }));
  },

  async create(unit: Omit<Unit, 'id'>) {
    const id = generateUniqueId('unit');
    
    // Transform camelCase to snake_case for database
    const dbUnit: any = {
      id,
      unit_number: unit.name,
      type: unit.type,
      status: unit.status,
      price: unit.price,
      customer_id: unit.customerId || null,
      project_id: (unit as any).projectId || null,
    };
    
    
    const { data, error } = await supabase
      .from('units')
      .insert([dbUnit])
      .select(`
        *,
        customers:customer_id (
          id,
          name
        )
      `);
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        name: data[0].unit_number,
        type: data[0].type,
        status: data[0].status,
        price: data[0].price,
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || null,
        projectId: data[0].project_id,
      };
    }
  },

  async update(id: string, unit: Partial<Unit>) {
    // Transform camelCase to snake_case for database
    const dbUnit: any = {};
    if (unit.name !== undefined) dbUnit.unit_number = unit.name;
    if (unit.type !== undefined) dbUnit.type = unit.type;
    if (unit.status !== undefined) dbUnit.status = unit.status;
    if (unit.price !== undefined) dbUnit.price = unit.price;
    if (unit.customerId !== undefined) dbUnit.customer_id = unit.customerId;
    if ((unit as any).projectId !== undefined) dbUnit.project_id = (unit as any).projectId;
    
    const { data, error } = await supabase
      .from('units')
      .update(dbUnit)
      .eq('id', id)
      .select(`
        *,
        customers:customer_id (
          id,
          name
        )
      `);
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        name: data[0].unit_number,
        type: data[0].type,
        status: data[0].status,
        price: data[0].price,
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || null,
        projectId: data[0].project_id,
      };
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  subscribe(callback: (units: Unit[]) => void) {
    const subscription = supabase
      .channel('units')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'units' }, () => {
        unitsService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * BOOKINGS SERVICE
 */
export const bookingsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, customers(name), units(unit_number)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Transform snake_case to camelCase
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
    
    // Transform to snake_case for database
    const dbData: any = {
      id,
      unit_id: (booking as any).unit_id || booking.unitId,
      customer_id: (booking as any).customer_id || booking.customerId,
      booking_date: (booking as any).booking_date || booking.bookingDate,
      total_price: (booking as any).total_price ?? (booking as any).totalPrice ?? 0,
      amount_paid: (booking as any).amount_paid ?? booking.amountPaid ?? 0,
      status: booking.status || 'Active',
    };
    // ✅ إضافة project_id إذا موجود
    const projectId = (booking as any).project_id || (booking as any).projectId;
    if (projectId) dbData.project_id = projectId;
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([dbData])
      .select('*, customers(name), units(unit_number)');
    if (error) throw error;
    
    // Transform response back to camelCase
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
    // Transform to snake_case for database
    const dbData: any = {};
    Object.entries(booking).forEach(([key, value]) => {
      if (key === 'unitId') dbData.unit_id = value;
      else if (key === 'customerId') dbData.customer_id = value;
      else if (key === 'bookingDate') dbData.booking_date = value;
      else if (key === 'amountPaid') dbData.amount_paid = value;
      else if (key === 'totalPrice') dbData.total_price = value;
      else if (key === 'projectId') dbData.project_id = value;
      else if (key === 'unitSaleId') dbData.unit_sale_id = value;
      else if (key === 'paymentPlanYears') dbData.payment_plan_years = value;
      else if (key === 'paymentFrequencyMonths') dbData.payment_frequency_months = value;
      else if (key !== 'id' && key !== 'unitName' && key !== 'customerName') dbData[key] = value;
    });
    
    const { data, error } = await supabase
      .from('bookings')
      .update(dbData)
      .eq('id', id)
      .select('*, customers(name), units(unit_number)');
    if (error) throw error;
    
    // Transform response back to camelCase
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
    
    // Transform snake_case to camelCase
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

/**
 * PAYMENTS SERVICE
 */
export const paymentsService = {
  async getAll() {
    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false});
    if (paymentsError) throw paymentsError;
    
    // Get all bookings to map customer data and initial payment
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, unit_id, amount_paid, customers(name), units(unit_number)');
    if (bookingsError) throw bookingsError;
    
    // Get all units to map unit_price
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, price');
    if (unitsError) throw unitsError;
    
    // ✅ جلب الدفعات الإضافية لحساب المبلغ المتبقي بشكل صحيح
    const { data: extraPayments, error: extraPaymentsError } = await supabase
      .from('extra_payments')
      .select('booking_id, amount');
    if (extraPaymentsError) throw extraPaymentsError;
    
    // ✅ تم استخدام nearlyEqual العامة من أعلى الملف

    // Create maps for efficient lookup
    const bookingMap = new Map<string, any>();
    (bookings || []).forEach((booking: any) => {
      bookingMap.set(booking.id, {
        ...booking,
        customer_name: booking.customers?.name,
        unit_name: booking.units?.unit_number,
      });
    });
    
    const unitMap = new Map();
    (units || []).forEach(unit => {
      unitMap.set(unit.id, unit);
    });
    
    // Calculate total paid per booking.
    // IMPORTANT:
    // - In the current DB, `bookings.amount_paid` is maintained by trigger to be SUM(payments.amount).
    // - In older data, `bookings.amount_paid` may represent only the booking deposit and payments contain only additional payments.
    // To stay compatible, we compare both sources and only add when they differ.
    const sumPaymentsPerBooking = new Map<string, number>();
    (payments || []).forEach((payment: any) => {
      const current = sumPaymentsPerBooking.get(payment.booking_id) || 0;
      sumPaymentsPerBooking.set(payment.booking_id, current + (payment.amount || 0));
    });

    // ✅ حساب مجموع الدفعات الإضافية لكل حجز
    const sumExtraPaymentsPerBooking = new Map<string, number>();
    (extraPayments || []).forEach((ep: any) => {
      const current = sumExtraPaymentsPerBooking.get(ep.booking_id) || 0;
      sumExtraPaymentsPerBooking.set(ep.booking_id, current + (ep.amount || 0));
    });

    const totalPaidPerBooking = new Map<string, number>();
    (bookings || []).forEach((booking: any) => {
      const bookingPaid = Number(booking.amount_paid || 0);
      const paymentsSum = Number(sumPaymentsPerBooking.get(booking.id) || 0);
      const extraPaymentsSum = Number(sumExtraPaymentsPerBooking.get(booking.id) || 0); // ✅ إضافة الدفعات الإضافية

      // If trigger is active, bookingPaid ~= paymentsSum (don't double-count).
      // If they differ (legacy), treat bookingPaid as deposit + paymentsSum.
      const basePaid = nearlyEqual(bookingPaid, paymentsSum)
        ? paymentsSum
        : bookingPaid + paymentsSum;
      
      // ✅ إجمالي المدفوع = الدفعات العادية + الدفعات الإضافية
      const totalPaid = basePaid + extraPaymentsSum;

      totalPaidPerBooking.set(booking.id, totalPaid);
    });
    
    // Transform payments with enriched booking and unit data
    return (payments || []).map((payment: any) => {
      const booking = bookingMap.get(payment.booking_id);
      const unit = booking ? unitMap.get(booking.unit_id) : null;
      const unitPrice = unit?.price || 0;
      const totalPaid = totalPaidPerBooking.get(payment.booking_id) || 0;
      
      return {
        id: payment.id,
        bookingId: payment.booking_id,
        customerId: booking?.customer_id,
        customerName: booking?.customer_name,
        unitId: booking?.unit_id,
        unitName: booking?.unit_name,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        paymentType: payment.payment_type, // ✅ إضافة نوع الدفعة
        unitPrice: unitPrice,
        remainingAmount: unitPrice - totalPaid,
        accountId: payment.account_id,
        notes: payment.notes,
      };
    });
  },

  async getByCustomerId(customerId: string) {
    // ✅ تحسين الأداء: جلب حجوزات العميل أولاً ثم الدفعات المرتبطة فقط
    
    // الخطوة 1: جلب حجوزات العميل فقط
    const { data: customerBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, unit_id, amount_paid, customers(name), units(unit_number, price)')
      .eq('customer_id', customerId);
    if (bookingsError) throw bookingsError;
    
    if (!customerBookings || customerBookings.length === 0) {
      return []; // لا يوجد حجوزات لهذا العميل
    }
    
    const bookingIds = customerBookings.map(b => b.id);
    
    // الخطوة 2: جلب الدفعات المرتبطة بحجوزات العميل فقط
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .in('booking_id', bookingIds)
      .order('payment_date', { ascending: false });
    if (paymentsError) throw paymentsError;
    
    // الخطوة 3: جلب الدفعات الإضافية المرتبطة فقط
    const { data: extraPayments, error: extraPaymentsError } = await supabase
      .from('extra_payments')
      .select('booking_id, amount')
      .in('booking_id', bookingIds);
    if (extraPaymentsError) throw extraPaymentsError;

    // إنشاء خرائط للبحث السريع
    const bookingMap = new Map<string, any>();
    (customerBookings || []).forEach((booking: any) => {
      bookingMap.set(booking.id, {
        ...booking,
        customer_name: booking.customers?.name,
        unit_name: booking.units?.unit_number,
        unit_price: booking.units?.price || 0,
      });
    });
    
    // حساب مجموع الدفعات لكل حجز
    const sumPaymentsPerBooking = new Map<string, number>();
    (payments || []).forEach((payment: any) => {
      const current = sumPaymentsPerBooking.get(payment.booking_id) || 0;
      sumPaymentsPerBooking.set(payment.booking_id, current + (payment.amount || 0));
    });

    // حساب مجموع الدفعات الإضافية لكل حجز
    const sumExtraPaymentsPerBooking = new Map<string, number>();
    (extraPayments || []).forEach((ep: any) => {
      const current = sumExtraPaymentsPerBooking.get(ep.booking_id) || 0;
      sumExtraPaymentsPerBooking.set(ep.booking_id, current + (ep.amount || 0));
    });

    // حساب إجمالي المدفوع لكل حجز
    const totalPaidPerBooking = new Map<string, number>();
    customerBookings.forEach((booking: any) => {
      const bookingPaid = Number(booking.amount_paid || 0);
      const paymentsSum = Number(sumPaymentsPerBooking.get(booking.id) || 0);
      const extraPaymentsSum = Number(sumExtraPaymentsPerBooking.get(booking.id) || 0);
      
      const basePaid = nearlyEqual(bookingPaid, paymentsSum)
        ? paymentsSum
        : bookingPaid + paymentsSum;
      
      const totalPaid = basePaid + extraPaymentsSum;
      totalPaidPerBooking.set(booking.id, totalPaid);
    });
    
    // تحويل الدفعات مع البيانات المُثرية
    return (payments || []).map((payment: any) => {
      const booking = bookingMap.get(payment.booking_id);
      const unitPrice = booking?.unit_price || 0;
      const totalPaid = totalPaidPerBooking.get(payment.booking_id) || 0;
      
      return {
        id: payment.id,
        bookingId: payment.booking_id,
        customerId: booking?.customer_id,
        customerName: booking?.customer_name,
        unitId: booking?.unit_id,
        unitName: booking?.unit_name,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        paymentType: payment.payment_type,
        unitPrice: unitPrice,
        remainingAmount: unitPrice - totalPaid,
        accountId: payment.account_id,
        notes: payment.notes,
      };
    });
  },

  async create(payment: Omit<Payment, 'id' | 'remainingAmount' | 'totalPaidSoFar'>) {
    const id = generateUniqueId('payment');
    
    // Insert with new structure including payment_type
    const dbData = {
      id,
      booking_id: payment.bookingId,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      payment_type: payment.paymentType || 'installment',
      account_id: payment.accountId || null,
      notes: payment.notes || null,
      created_by: payment.createdBy || null,
    };
    
    const { data, error } = await supabase
      .from('payments')
      .insert([dbData])
      .select();
    if (error) throw error;
    
    // Get booking info to enrich the response
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, unit_id, customers(name), units(unit_number, project_id)')
      .eq('id', payment.bookingId)
      .single();

    if (bookingError) throw bookingError;

    const bookingProjectId: string | null = (booking as any)?.units?.project_id ?? null;

    // جلب صندوق المشروع تلقائياً إذا كانت الـ booking تابعة لمشروع ولم يتم تحديد حساب
    let finalAccountId = payment.accountId || null;
    if (!finalAccountId && bookingProjectId) {
      try {
        const projectCashbox = await accountsService.getOrCreateProjectCashbox(bookingProjectId);
        finalAccountId = projectCashbox.id;
      } catch (error) {
        console.warn('Error getting project cashbox for payment:', error);
      }
    }

    // Create a matching treasury transaction so accounts balances are real.
    if (finalAccountId) {
      await transactionsService.create({
        accountId: finalAccountId,
        accountName: '',
        type: 'Deposit',
        date: payment.paymentDate,
        description: payment.notes || `Payment (${payment.paymentType || 'installment'})`,
        amount: payment.amount,
        projectId: bookingProjectId,
        sourceId: id,
        sourceType: 'Payment',
      });
    }
    
    // Get unit price
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('price')
      .eq('id', booking?.unit_id)
      .single();
    
    const unitPrice = unit?.price || 0;
    
    // ✅ حساب إجمالي المدفوعات للحجز (وليس الدفعة الحالية فقط)
    const { data: allBookingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', data[0].booking_id);
    const totalPaid = (allBookingPayments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Transform response back to camelCase with enriched data
    if (data?.[0]) {
      return {
        id: data[0].id,
        bookingId: data[0].booking_id,
        customerId: booking?.customer_id,
        customerName: (booking as any)?.customers?.name,
        unitId: booking?.unit_id,
        unitName: (booking as any)?.units?.unit_number,
        amount: data[0].amount,
        paymentDate: data[0].payment_date,
        paymentType: data[0].payment_type, // ✅ إضافة نوع الدفعة
        unitPrice: unitPrice,
        remainingAmount: unitPrice - totalPaid,
        accountId: payment.accountId,
        notes: payment.notes,
      };
    }
  },

  async update(id: string, payment: Partial<Payment>) {
    // Update with new structure
    const dbData: any = {};
    if (payment.bookingId !== undefined) dbData.booking_id = payment.bookingId;
    if (payment.amount !== undefined) dbData.amount = payment.amount;
    if (payment.paymentDate !== undefined) dbData.payment_date = payment.paymentDate;
    if (payment.paymentType !== undefined) dbData.payment_type = payment.paymentType;
    if (payment.accountId !== undefined) dbData.account_id = payment.accountId;
    if (payment.notes !== undefined) dbData.notes = payment.notes;
    
    const { data, error } = await supabase
      .from('payments')
      .update(dbData)
      .eq('id', id)
      .select();
    if (error) throw error;

    // Keep matching treasury transaction in sync (if any)
    // Find booking -> project for projectId attribution.
    const updatedBookingId = data?.[0]?.booking_id;
    if (updatedBookingId) {
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('units(project_id)')
        .eq('id', updatedBookingId)
        .single();
      if (bookingError) throw bookingError;

      const bookingProjectId: string | null = (booking as any)?.units?.project_id ?? null;

      // Locate any existing transaction for this payment
      const { data: existingTx, error: txLookupError } = await supabase
        .from('transactions')
        .select('id')
        .eq('source_type', 'Payment')
        .eq('source_id', id)
        .maybeSingle();
      if (txLookupError) throw txLookupError;

      // جلب صندوق المشروع تلقائياً إذا لم يتم تحديد حساب
      let accountId = payment.accountId !== undefined ? payment.accountId : data?.[0]?.account_id;
      if (!accountId && bookingProjectId) {
        try {
          const projectCashbox = await accountsService.getOrCreateProjectCashbox(bookingProjectId);
          accountId = projectCashbox.id;
        } catch (error) {
          console.warn('Error getting project cashbox for payment update:', error);
        }
      }

      const shouldHaveTx = !!accountId;
      if (!shouldHaveTx) {
        if (existingTx?.id) {
          await transactionsService.delete(existingTx.id);
        }
      } else {
        const amount = payment.amount !== undefined ? payment.amount : data?.[0]?.amount;
        const date = payment.paymentDate !== undefined ? payment.paymentDate : data?.[0]?.payment_date;
        const description = payment.notes !== undefined ? (payment.notes || `Payment (${data?.[0]?.payment_type || 'installment'})`) : (`Payment (${data?.[0]?.payment_type || 'installment'})`);

        if (existingTx?.id) {
          await transactionsService.update(existingTx.id, {
            accountId,
            accountName: '',
            type: 'Deposit',
            date,
            description,
            amount,
            projectId: bookingProjectId,
            sourceId: id,
            sourceType: 'Payment',
          });
        } else {
          await transactionsService.create({
            accountId,
            accountName: '',
            type: 'Deposit',
            date,
            description,
            amount,
            projectId: bookingProjectId,
            sourceId: id,
            sourceType: 'Payment',
          });
        }
      }
    }
    
    // Get booking info to enrich the response
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('customer_id, unit_id, customers(name), units(unit_number)')
      .eq('id', data?.[0]?.booking_id)
      .single();
    
    // Get unit price
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('price')
      .eq('id', booking?.unit_id)
      .single();
    
    const unitPrice = unit?.price || 0;
    
    // ✅ حساب إجمالي المدفوعات للحجز
    const { data: allBookingPaymentsUpdate } = await supabase
      .from('payments')
      .select('amount')
      .eq('booking_id', data?.[0]?.booking_id);
    const totalPaidUpdate = (allBookingPaymentsUpdate || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    
    // Transform response back to camelCase with enriched data
    if (data?.[0]) {
      return {
        id: data[0].id,
        bookingId: data[0].booking_id,
        customerId: booking?.customer_id,
        customerName: (booking as any)?.customers?.name,
        unitId: booking?.unit_id,
        unitName: (booking as any)?.units?.unit_number,
        amount: data[0].amount,
        paymentDate: data[0].payment_date,
        paymentType: data[0].payment_type, // ✅ إضافة نوع الدفعة
        unitPrice: unitPrice,
        remainingAmount: unitPrice - totalPaidUpdate,
        accountId: payment.accountId,
        notes: payment.notes,
      };
    }
  },

  async delete(id: string) {
    // Remove matching treasury transaction first (best-effort)
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('source_type', 'Payment')
      .eq('source_id', id)
      .maybeSingle();
    if (existingTx?.id) {
      await transactionsService.delete(existingTx.id);
    }

    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Get all payments for a specific booking with full details
  async getByBookingId(bookingId: string): Promise<Payment[]> {
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('payment_date', { ascending: true });
    
    if (paymentsError) throw paymentsError;

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        customer_id,
        unit_id,
        customers(name),
        units(unit_number, price)
      `)
      .eq('id', bookingId)
      .single();
    
    if (bookingError) throw bookingError;

    // Get account names for payments
    const accountIds = payments?.map(p => p.account_id).filter(Boolean) || [];
    let accountMap = new Map();
    
    if (accountIds.length > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id, name')
        .in('id', accountIds);
      
      accounts?.forEach(acc => accountMap.set(acc.id, acc.name));
    }

    const unitPrice = (booking as any)?.units?.price || 0;
    let cumulativePaid = 0;

    return (payments || []).map((payment: any) => {
      cumulativePaid += payment.amount;
      
      return {
        id: payment.id,
        bookingId: payment.booking_id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        paymentType: payment.payment_type,
        accountId: payment.account_id,
        accountName: accountMap.get(payment.account_id),
        notes: payment.notes,
        createdBy: payment.created_by,
        customerId: booking?.customer_id,
        customerName: (booking as any)?.customers?.name,
        unitId: booking?.unit_id,
        unitName: (booking as any)?.units?.name,
        unitPrice: unitPrice,
        totalPaidSoFar: cumulativePaid,
        remainingAmount: unitPrice - cumulativePaid,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
      };
    });
  },

  subscribe(callback: (payments: Payment[]) => void) {
    const subscription = supabase
      .channel('payments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        paymentsService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * EXPENSES SERVICE
 */
export const expensesService = {
  async getAll(): Promise<Expense[]> {
    let allData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

    // Fetch all records in batches to bypass the 1000 row limit
    while (hasMore) {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        allData = allData.concat(data);
        from += limit;
        hasMore = data.length === limit;
      } else {
        hasMore = false;
      }
    }
    
    // Map database fields to frontend fields
    return allData.map(exp => ({
      id: exp.id,
      date: exp.expense_date,
      description: exp.description,
      amount: exp.amount,
      categoryId: exp.category_id,
      projectId: exp.project_id,
      accountId: exp.account_id,
      vendorId: exp.vendor_id,
      transactionId: exp.transaction_id,
      deferredPaymentInstallmentId: exp.deferred_payment_installment_id,
      employeeId: exp.employee_id,
    }));
  },

  async create(expense: Omit<Expense, 'id'>) {
    // Validation
    const dateValidation = validateDate(expense.date);
    if (!dateValidation.valid) throw new ValidationError(dateValidation.error!);
    
    const amountValidation = validateAmount(expense.amount);
    if (!amountValidation.valid) throw new ValidationError(amountValidation.error!);
    
    if (expense.description) {
      const descriptionValidation = validateText(expense.description, 500);
      if (!descriptionValidation.valid) throw new ValidationError(descriptionValidation.error!);
    }
    
    const id = generateUniqueId('expense');
    
    // Convert camelCase to snake_case for database with sanitization
    const dbExpense = {
      id,
      expense_date: expense.date,
      description: expense.description ? sanitizeText(expense.description) : null,
      amount: expense.amount,
      category_id: expense.categoryId || null, // Convert empty string to null
      project_id: expense.projectId || null,
      account_id: expense.accountId || null,   // Convert empty string to null
      vendor_id: expense.vendorId || null,
      transaction_id: expense.transactionId || null,
      deferred_payment_installment_id: expense.deferredPaymentInstallmentId || null,
      employee_id: expense.employeeId || null,
    };
    
    
    const { error } = await supabase
      .from('expenses')
      .insert(dbExpense);
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }
    
    
    // Fetch the inserted record
    const { data: fetchedData, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw fetchError;
    }
    
    const exp = fetchedData;
    return exp ? {
      id: exp.id,
      date: exp.expense_date,
      description: exp.description,
      amount: exp.amount,
      categoryId: exp.category_id,
      projectId: exp.project_id,
      accountId: exp.account_id,
      vendorId: exp.vendor_id,
      transactionId: exp.transaction_id,
      deferredPaymentInstallmentId: exp.deferred_payment_installment_id,
      employeeId: exp.employee_id,
    } : null;
  },

  async update(id: string, expense: Partial<Expense>) {
    // Convert camelCase to snake_case for database
    // ✅ تحويل القيم الفارغة إلى null لتجنب خطأ المفتاح الأجنبي
    const dbUpdate: any = {};
    if (expense.date !== undefined) dbUpdate.expense_date = expense.date;
    if (expense.description !== undefined) dbUpdate.description = expense.description;
    if (expense.amount !== undefined) dbUpdate.amount = expense.amount;
    if (expense.categoryId !== undefined) dbUpdate.category_id = expense.categoryId || null;
    if (expense.projectId !== undefined) dbUpdate.project_id = expense.projectId || null;
    if (expense.accountId !== undefined) dbUpdate.account_id = expense.accountId || null;
    if (expense.vendorId !== undefined) dbUpdate.vendor_id = expense.vendorId || null;
    if (expense.transactionId !== undefined) dbUpdate.transaction_id = expense.transactionId || null;
    if (expense.deferredPaymentInstallmentId !== undefined) dbUpdate.deferred_payment_installment_id = expense.deferredPaymentInstallmentId || null;
    if (expense.employeeId !== undefined) dbUpdate.employee_id = expense.employeeId || null;
    
    const { data, error } = await supabase
      .from('expenses')
      .update(dbUpdate)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    const exp = data?.[0];
    return exp ? {
      id: exp.id,
      date: exp.expense_date,
      description: exp.description,
      amount: exp.amount,
      categoryId: exp.category_id,
      projectId: exp.project_id,
      accountId: exp.account_id,
      vendorId: exp.vendor_id,
      transactionId: exp.transaction_id,
      deferredPaymentInstallmentId: exp.deferred_payment_installment_id,
      employeeId: exp.employee_id,
    } : null;
  },

  async delete(id: string) {
    
    // First verify the record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('expenses')
      .select('id')
      .eq('id', id)
      .single();
    
    if (checkError) {
      console.error('❌ Error checking expense existence:', checkError);
      if (checkError.code === 'PGRST116') {
        return; // Record doesn't exist, consider it deleted
      }
      throw checkError;
    }
    
    
    const { error, count } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) {
      console.error('❌ Delete error:', error);
      throw error;
    }
    
  },

  subscribe(callback: (expenses: Expense[]) => void) {
    const subscription = supabase
      .channel('expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        expensesService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * TRANSACTIONS SERVICE
 */
const mapTransactionFromDb = (dbTransaction: any): Transaction => ({
  id: dbTransaction.id,
  accountId: dbTransaction.account_id,
  accountName: dbTransaction.account_name,
  type: dbTransaction.type,
  date: dbTransaction.date,
  description: dbTransaction.description,
  amount: dbTransaction.amount,
  projectId: dbTransaction.project_id ?? null,
  sourceId: dbTransaction.source_id,
  sourceType: dbTransaction.source_type
});

export const transactionsService = {
  async getAll(filters?: { projectId?: string | null; accountId?: string | null }) {
    let query = supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    if (filters?.accountId) {
      query = query.eq('account_id', filters.accountId);
    }

    const { data, error } = await query;
    if (error) throw error;
    // Convert snake_case to camelCase
    return (data || []).map(mapTransactionFromDb);
  },

  async create(transaction: Omit<Transaction, 'id'>) {
    const id = generateUniqueId('transaction');
    // Convert camelCase to snake_case
    const dbTransaction = {
      id,
      account_id: transaction.accountId,
      account_name: transaction.accountName,
      type: transaction.type,
      date: transaction.date,
      description: transaction.description,
      amount: transaction.amount,
      project_id: transaction.projectId || null,
      source_id: transaction.sourceId,
      source_type: transaction.sourceType
    };
    const { error } = await supabase
      .from('transactions')
      .insert(dbTransaction);
    if (error) throw error;
    
    // Fetch the created record
    const { data: fetchedData, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    
    return fetchedData ? mapTransactionFromDb(fetchedData) : undefined;
  },

  async update(id: string, transaction: Partial<Transaction>) {
    // Convert camelCase to snake_case for update
    const dbUpdate: any = {};
    if (transaction.accountId !== undefined) dbUpdate.account_id = transaction.accountId;
    if (transaction.accountName !== undefined) dbUpdate.account_name = transaction.accountName;
    if (transaction.type !== undefined) dbUpdate.type = transaction.type;
    if (transaction.date !== undefined) dbUpdate.date = transaction.date;
    if (transaction.description !== undefined) dbUpdate.description = transaction.description;
    if (transaction.amount !== undefined) dbUpdate.amount = transaction.amount;
    if (transaction.projectId !== undefined) dbUpdate.project_id = transaction.projectId;
    if (transaction.sourceId !== undefined) dbUpdate.source_id = transaction.sourceId;
    if (transaction.sourceType !== undefined) dbUpdate.source_type = transaction.sourceType;
    
    const { error } = await supabase
      .from('transactions')
      .update(dbUpdate)
      .eq('id', id);
    if (error) throw error;
    
    // Fetch the updated record
    const { data: fetchedData, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    
    return fetchedData ? mapTransactionFromDb(fetchedData) : undefined;
  },

  async delete(id: string) {
    
    // First verify the record exists using maybeSingle to avoid 406 error
    const { data: existingRecord, error: checkError } = await supabase
      .from('transactions')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    
    if (checkError) {
      console.error('❌ Error checking transaction existence:', checkError);
      // If any error, try to delete anyway
    }
    
    if (!existingRecord) {
      return; // Record doesn't exist, consider it deleted
    }
    
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('❌ Delete transaction error:', error);
      throw error;
    }
  }
};

/**
 * UNIT SALES SERVICE
 */
export const unitSalesService = {
  async getAll(): Promise<UnitSaleRecord[]> {
    const { data, error } = await supabase
      .from('unit_sales')
      .select(`
        *,
        units:unit_id (unit_number),
        customers:customer_id (name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map database fields to frontend fields
    return (data || []).map((sale: any) => ({
      id: sale.id,
      unitId: sale.unit_id || '',
      unitName: sale.units?.unit_number || '',
      customerId: sale.customer_id || '',
      customerName: sale.customers?.name || '',
      salePrice: sale.sale_price || 0,
      finalSalePrice: sale.final_sale_price || 0,
      saleDate: sale.sale_date || '',
      documents: [],
      accountId: sale.account_id || '',
      transactionId: sale.transaction_id,
      projectId: sale.project_id,
    }));
  },

  async create(sale: Omit<UnitSaleRecord, 'id'>): Promise<UnitSaleRecord> {
    const id = generateUniqueId('sale');
    const { data, error } = await supabase
      .from('unit_sales')
      .insert([{
        id,
        unit_id: sale.unitId,
        customer_id: sale.customerId,
        sale_price: sale.salePrice,
        final_sale_price: sale.finalSalePrice,
        sale_date: sale.saleDate,
        account_id: sale.accountId,
        transaction_id: sale.transactionId,
        project_id: sale.projectId,
      }])
      .select(`
        *,
        units:unit_id (unit_number),
        customers:customer_id (name)
      `);
    if (error) throw error;
    
    const created = data?.[0];
    return {
      id: created.id,
      unitId: created.unit_id,
      unitName: created.units?.unit_number || '',
      customerId: created.customer_id,
      customerName: created.customers?.name || '',
      salePrice: created.sale_price,
      finalSalePrice: created.final_sale_price,
      saleDate: created.sale_date,
      documents: [],
      accountId: created.account_id,
      transactionId: created.transaction_id,
      projectId: created.project_id,
    };
  },

  async update(id: string, sale: Partial<UnitSaleRecord>) {
    // ✅ تحويل camelCase إلى snake_case
    const dbData: any = {};
    Object.entries(sale).forEach(([key, value]) => {
      if (key === 'unitId') dbData.unit_id = value;
      else if (key === 'customerId') dbData.customer_id = value;
      else if (key === 'salePrice') dbData.sale_price = value;
      else if (key === 'finalSalePrice') dbData.final_sale_price = value;
      else if (key === 'saleDate') dbData.sale_date = value;
      else if (key === 'accountId') dbData.account_id = value;
      else if (key === 'transactionId') dbData.transaction_id = value;
      else if (key === 'projectId') dbData.project_id = value;
      else if (key !== 'id' && key !== 'unitName' && key !== 'customerName' && key !== 'documents') dbData[key] = value;
    });
    const { data, error } = await supabase
      .from('unit_sales')
      .update(dbData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('unit_sales')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * EMPLOYEES SERVICE
 * ✅ تم تحديثها لدعم ربط الموظفين بالمشاريع
 */
export const employeesService = {
  // ✅ متغير للتخزين المؤقت - هل عمود project_id موجود؟
  _hasProjectIdColumn: null as boolean | null,

  /**
   * التحقق من وجود عمود project_id في جدول employees
   */
  async _checkProjectIdColumn(): Promise<boolean> {
    if (this._hasProjectIdColumn !== null) {
      return this._hasProjectIdColumn;
    }
    
    try {
      // استعلام بسيط للتحقق من وجود العمود
      const { data, error } = await supabase
        .from('employees')
        .select('project_id')
        .limit(1);
      
      // إذا نجح الاستعلام، العمود موجود
      this._hasProjectIdColumn = !error;
      return this._hasProjectIdColumn;
    } catch {
      this._hasProjectIdColumn = false;
      return false;
    }
  },

  /**
   * جلب جميع الموظفين مع إمكانية الفلترة حسب المشروع
   * الموظفين العامين (project_id = NULL) يظهرون دائماً
   */
  async getAll(filters?: { projectId?: string | null; includeGeneral?: boolean }): Promise<Employee[]> {
    // ✅ التحقق من وجود العمود أولاً
    const hasColumn = await this._checkProjectIdColumn();
    
    if (!hasColumn) {
      return this._getSimpleEmployees();
    }

    try {
      let query = supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });
      
      // ✅ فلترة حسب المشروع:
      // - إذا لم يتم تحديد projectId: إرجاع قائمة فارغة (يجب تحديد مشروع)
      // - إذا includeGeneral = true: إظهار موظفي المشروع + الموظفين العامين (NULL)
      // - إذا includeGeneral = false: إظهار موظفي المشروع المحدد فقط
      if (filters?.projectId) {
        if (filters.includeGeneral) {
          query = query.or(`project_id.eq.${filters.projectId},project_id.is.null`);
        } else {
          // ✅ فقط موظفي هذا المشروع
          query = query.eq('project_id', filters.projectId);
        }
      } else {
        // ✅ لا يوجد مشروع محدد - إرجاع قائمة فارغة
        return [];
      }
      
      const { data, error } = await query;
      
      
      if (error) throw error;
      
      // ✅ جلب أسماء المشاريع بشكل منفصل
      const projectIds = [...new Set((data || []).map(emp => emp.project_id).filter(Boolean))];
      let projectMap = new Map<string, string>();
      
      if (projectIds.length > 0) {
        const { data: projects } = await supabase
          .from('projects')
          .select('id, name')
          .in('id', projectIds);
        
        projects?.forEach(p => projectMap.set(p.id, p.name));
      }
      
      // Map database fields to frontend fields
      return (data || []).map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        position: emp.position || '',
        salary: emp.salary || 0,
        projectId: emp.project_id,
        projectName: projectMap.get(emp.project_id) || null,
        phone: emp.phone,
        email: emp.email,
        hireDate: emp.hire_date,
        isActive: emp.is_active ?? true,
      }));
    } catch (err) {
      console.error('Error fetching employees:', err);
      // ✅ Fallback: العمود غير موجود
      this._hasProjectIdColumn = false;
      return this._getSimpleEmployees();
    }
  },

  /**
   * استعلام بسيط بدون project_id (للتوافق مع قواعد البيانات القديمة)
   */
  async _getSimpleEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(emp => ({
      id: emp.id,
      name: emp.name,
      position: emp.position || '',
      salary: emp.salary || 0,
      phone: emp.phone,
      email: emp.email,
      hireDate: emp.hire_date,
      isActive: emp.is_active ?? true,
    }));
  },

  /**
   * جلب موظفي مشروع معين
   */
  async getByProject(projectId: string): Promise<Employee[]> {
    return this.getAll({ projectId });
  },

  async upsertFromAppEmployee(employee: Employee) {
    // The app historically stored employees in localStorage; this ensures a DB row exists
    // so we can reference it from expenses.employee_id without FK failures.
    
    // ✅ التحقق من وجود العمود أولاً
    const hasColumn = await this._checkProjectIdColumn();
    
    const payload: any = {
      id: employee.id,
      name: employee.name,
      position: employee.position || null,
      salary: employee.salary,
    };
    
    // ✅ إضافة project_id إذا موجود والعمود متاح
    if (hasColumn && employee.projectId) {
      payload.project_id = employee.projectId;
    }

    try {
      // ✅ استعلام بسيط بدون JOIN
      const { data, error } = await supabase
        .from('employees')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();

      if (error) throw error;
      
      // ✅ التحقق من وجود العمود
      if ('project_id' in data) {
        this._hasProjectIdColumn = true;
      }
      
      // ✅ جلب اسم المشروع بشكل منفصل
      let projectName: string | null = null;
      if (data.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', data.project_id)
          .single();
        projectName = project?.name || null;
      }
      
      return {
        id: data.id,
        name: data.name,
        position: data.position || '',
        salary: data.salary || 0,
        projectId: data.project_id,
        projectName,
      };
    } catch (error: any) {
      // fallback if project_id column doesn't exist
      this._hasProjectIdColumn = false;
      
      const { data: simpleData, error: simpleError } = await supabase
        .from('employees')
        .upsert({
          id: employee.id,
          name: employee.name,
          position: employee.position || null,
          salary: employee.salary,
        }, { onConflict: 'id' })
        .select('*')
        .single();
      
      if (simpleError) throw simpleError;
      return simpleData;
    }
  },

  async create(employee: Omit<Employee, 'id'>) {
    const id = generateUniqueId('emp');
    
    // ✅ التحقق من وجود العمود أولاً
    const hasColumn = await this._checkProjectIdColumn();
    
    // Build insert object
    const baseData: any = {
      id,
      name: employee.name,
      position: employee.position || null,
      salary: employee.salary || 0,
    };
    
    // ✅ أضف project_id إذا كان العمود موجود وتم تمرير قيمة
    if (hasColumn && employee.projectId) {
      baseData.project_id = employee.projectId;
    }
    
    try {
      // ✅ استعلام بسيط بدون JOIN
      const { data, error } = await supabase
        .from('employees')
        .insert([baseData])
        .select('*');
      
      if (error) throw error;
      
      const emp = data?.[0];
      if (!emp) return undefined;
      
      // ✅ التحقق من وجود project_id وتحديث الحالة
      if ('project_id' in emp) {
        this._hasProjectIdColumn = true;
      }
      
      // ✅ جلب اسم المشروع بشكل منفصل إذا لزم الأمر
      let projectName: string | null = null;
      if (emp.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', emp.project_id)
          .single();
        projectName = project?.name || null;
      }
      
      return {
        id: emp.id,
        name: emp.name,
        position: emp.position || '',
        salary: emp.salary || 0,
        projectId: emp.project_id,
        projectName,
      };
    } catch (error: any) {
      // ✅ fallback: العمود غير موجود
      this._hasProjectIdColumn = false;
      console.warn('Employee create fallback - project_id column may not exist');
      
      const { data: simpleData, error: simpleError } = await supabase
        .from('employees')
        .insert([{
          id,
          name: employee.name,
          position: employee.position || null,
          salary: employee.salary || 0,
        }])
        .select('*');
      
      if (simpleError) throw simpleError;
      
      const emp = simpleData?.[0];
      return emp ? {
        id: emp.id,
        name: emp.name,
        position: emp.position || '',
        salary: emp.salary || 0,
      } : undefined;
    }
  },

  async update(id: string, employee: Partial<Employee>) {
    // ✅ التحقق من وجود العمود أولاً
    const hasColumn = await this._checkProjectIdColumn();
    
    // Build update object with snake_case
    const updateData: any = {};
    if (employee.name !== undefined) updateData.name = employee.name;
    if (employee.position !== undefined) updateData.position = employee.position;
    if (employee.salary !== undefined) updateData.salary = employee.salary;
    
    // ✅ أضف project_id فقط إذا علمنا أن العمود موجود
    if (hasColumn && employee.projectId !== undefined) {
      updateData.project_id = employee.projectId || null;
    }
    
    try {
      // ✅ استعلام بسيط بدون JOIN
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select('*');
      
      if (error) throw error;
      
      const emp = data?.[0];
      if (!emp) return undefined;
      
      // ✅ جلب اسم المشروع بشكل منفصل
      let projectName: string | null = null;
      if (emp.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', emp.project_id)
          .single();
        projectName = project?.name || null;
      }
      
      return {
        id: emp.id,
        name: emp.name,
        position: emp.position || '',
        salary: emp.salary || 0,
        projectId: emp.project_id,
        projectName,
      };
    } catch (error: any) {
      // fallback if project_id column doesn't exist
      this._hasProjectIdColumn = false;
      
      const basicUpdate: any = {};
      if (employee.name !== undefined) basicUpdate.name = employee.name;
      if (employee.position !== undefined) basicUpdate.position = employee.position;
      if (employee.salary !== undefined) basicUpdate.salary = employee.salary;
      
      const { data: simpleData, error: simpleError } = await supabase
        .from('employees')
        .update(basicUpdate)
        .eq('id', id)
        .select('*');
      
      if (simpleError) throw simpleError;
      
      const emp = simpleData?.[0];
      return emp ? {
        id: emp.id,
        name: emp.name,
        position: emp.position || '',
        salary: emp.salary || 0,
      } : undefined;
    }
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  subscribe(callback: (employees: Employee[]) => void) {
    const subscription = supabase
      .channel('employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        employeesService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * PROJECTS SERVICE
 */
export const projectsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(proj => ({
      ...proj,
      assignedUserId: proj.assigned_user_id,
      salesUserId: proj.sales_user_id,
      accountingUserId: proj.accounting_user_id,
    }));
  },

  async create(project: Omit<Project, 'id'>) {
    // Let database generate UUID (DEFAULT gen_random_uuid()) and send only provided fields
    const dbProject: Record<string, unknown> = {
      name: project.name,
      description: project.description || null,
    };

    if (project.assignedUserId !== undefined) {
      dbProject.assigned_user_id = project.assignedUserId || null;
    }
    if (project.salesUserId !== undefined) {
      dbProject.sales_user_id = project.salesUserId || null;
    }
    if (project.accountingUserId !== undefined) {
      dbProject.accounting_user_id = project.accountingUserId || null;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .insert([dbProject])
      .select();
    if (error) throw error;
    
    // Map back to camelCase
    const result = data?.[0];
    
    // ✅ إنشاء الحسابات المالية تلقائياً للمشروع الجديد
    if (result?.id) {
      try {
        // إنشاء صندوق المشروع (Cash)
        await accountsService.create({
          name: `صندوق ${project.name}`,
          type: 'Cash',
          initialBalance: 0,
          projectId: result.id,
          description: `صندوق نقدي خاص بمشروع ${project.name}`,
        });
        
        // إنشاء حساب بنكي للمشروع (Bank)
        await accountsService.create({
          name: `بنك ${project.name}`,
          type: 'Bank',
          initialBalance: 0,
          projectId: result.id,
          description: `حساب بنكي خاص بمشروع ${project.name}`,
        });
        
      } catch (accountError) {
        // لا نوقف إنشاء المشروع إذا فشل إنشاء الحسابات
        console.warn('⚠️ تعذر إنشاء الحسابات المالية للمشروع:', accountError);
      }
    }
    
    return result ? {
      ...result,
      assignedUserId: result.assigned_user_id,
      salesUserId: result.sales_user_id,
      accountingUserId: result.accounting_user_id,
    } : result;
  },

  async update(id: string, project: Partial<Project>) {
    // Convert camelCase to snake_case for database
    const dbProject: any = { ...project };
    
    if ('assignedUserId' in project) {
      dbProject.assigned_user_id = project.assignedUserId || null;
      delete dbProject.assignedUserId;
    }
    if ('salesUserId' in project) {
      dbProject.sales_user_id = project.salesUserId || null;
      delete dbProject.salesUserId;
    }
    if ('accountingUserId' in project) {
      dbProject.accounting_user_id = project.accountingUserId || null;
      delete dbProject.accountingUserId;
    }
    
    const { data, error } = await supabase
      .from('projects')
      .update(dbProject)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    // Map back to camelCase
    const result = data?.[0];
    return result ? {
      ...result,
      assignedUserId: result.assigned_user_id,
      salesUserId: result.sales_user_id,
      accountingUserId: result.accounting_user_id,
    } : result;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * VENDORS SERVICE
 */
export const vendorsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(vendor: Omit<Vendor, 'id'>) {
    const id = generateUniqueId('vendor');
    const { data, error } = await supabase
      .from('vendors')
      .insert([{ ...vendor, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, vendor: Partial<Vendor>) {
    const { data, error } = await supabase
      .from('vendors')
      .update(vendor)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * UNIT TYPES SERVICE
 */
export const unitTypesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('unit_types')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(item: Omit<UnitType, 'id'>) {
    const id = generateUniqueId('type');
    const { data, error } = await supabase
      .from('unit_types')
      .insert([{ ...item, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, item: Partial<UnitType>) {
    const { data, error } = await supabase
      .from('unit_types')
      .update({ name: item.name })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('unit_types')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * UNIT STATUSES SERVICE
 */
export const unitStatusesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('unit_statuses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(item: Omit<UnitStatus, 'id'>) {
    const id = generateUniqueId('status');
    const { data, error } = await supabase
      .from('unit_statuses')
      .insert([{ ...item, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, item: Partial<UnitStatus>) {
    const { data, error } = await supabase
      .from('unit_statuses')
      .update({ name: item.name })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('unit_statuses')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * EXPENSE CATEGORIES SERVICE
 */
export const expenseCategoriesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      projectId: cat.project_id
    }));
  },

  async getByProject(projectId: string | null) {
    // ✅ تم إصلاح ثغرة SQL Injection - التحقق من صحة projectId قبل استخدامه
    // جلب فئات المشروع المحدد + الفئات العامة (التي ليس لها مشروع)
    
    if (projectId) {
      // ✅ التحقق من أن projectId هو معرّف صالح (UUID أو ID مخصص)
      const idPattern = /^[a-zA-Z0-9_-]+$/;
      if (!idPattern.test(projectId)) {
        throw new Error('معرّف المشروع غير صالح');
      }
      
      // ✅ استخدام استعلامين منفصلين وجمع النتائج بدلاً من or مع template string
      const [projectCats, generalCats] = await Promise.all([
        supabase
          .from('expense_categories')
          .select('*')
          .eq('project_id', projectId)
          .order('name', { ascending: true }),
        supabase
          .from('expense_categories')
          .select('*')
          .is('project_id', null)
          .order('name', { ascending: true })
      ]);
      
      if (projectCats.error) throw projectCats.error;
      if (generalCats.error) throw generalCats.error;
      
      const allCats = [...(projectCats.data || []), ...(generalCats.data || [])];
      // إزالة التكرارات بناءً على الاسم
      const uniqueCats = allCats.filter((cat, index, self) =>
        index === self.findIndex(c => c.id === cat.id)
      );
      
      return uniqueCats.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        projectId: cat.project_id
      }));
    } else {
      // جلب الفئات العامة فقط
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .is('project_id', null)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []).map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        projectId: cat.project_id
      }));
    }
  },

  async findByName(name: string, projectId: string | null) {
    // ✅ تم إصلاح ثغرة SQL Injection
    // البحث عن فئة بالاسم ضمن المشروع أو الفئات العامة
    const trimmedName = name.trim();
    
    if (projectId) {
      // ✅ التحقق من صحة projectId
      const idPattern = /^[a-zA-Z0-9_-]+$/;
      if (!idPattern.test(projectId)) {
        throw new Error('معرّف المشروع غير صالح');
      }
      
      // ✅ استعلامين منفصلين بدلاً من or
      const [projectResult, generalResult] = await Promise.all([
        supabase
          .from('expense_categories')
          .select('*')
          .eq('name', trimmedName)
          .eq('project_id', projectId)
          .maybeSingle(),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('name', trimmedName)
          .is('project_id', null)
          .maybeSingle()
      ]);
      
      if (projectResult.error) throw projectResult.error;
      if (generalResult.error) throw generalResult.error;
      
      const cat = projectResult.data || generalResult.data;
      if (cat) {
        return {
          id: cat.id,
          name: cat.name,
          description: cat.description,
          projectId: cat.project_id
        };
      }
      return null;
    } else {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .eq('name', trimmedName)
        .is('project_id', null)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          projectId: data.project_id
        };
      }
      return null;
    }
  },

  async findOrCreate(name: string, projectId: string | null) {
    // البحث عن فئة موجودة أولاً
    const existing = await this.findByName(name, projectId);
    if (existing) {
      return existing;
    }
    
    // إنشاء فئة جديدة للمشروع المحدد
    const id = generateUniqueId('cat');
    const { data, error } = await supabase
      .from('expense_categories')
      .insert([{ 
        id, 
        name: name.trim(), 
        description: `فئة تم إنشاؤها تلقائياً`,
        project_id: projectId 
      }])
      .select();
    if (error) throw error;
    
    const cat = data?.[0];
    return cat ? {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      projectId: cat.project_id
    } : null;
  },

  async create(item: Omit<ExpenseCategory, 'id'>) {
    const id = generateUniqueId('cat');
    const { data, error } = await supabase
      .from('expense_categories')
      .insert([{ 
        id, 
        name: item.name,
        description: item.description,
        project_id: item.projectId || null
      }])
      .select();
    if (error) throw error;
    const cat = data?.[0];
    return cat ? {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      projectId: cat.project_id
    } : null;
  },

  async update(id: string, item: Partial<ExpenseCategory>) {
    const updateData: any = {};
    if (item.name !== undefined) updateData.name = item.name;
    if (item.description !== undefined) updateData.description = item.description;
    if (item.projectId !== undefined) updateData.project_id = item.projectId;
    
    const { data, error } = await supabase
      .from('expense_categories')
      .update(updateData)
      .eq('id', id)
      .select();
    if (error) throw error;
    const cat = data?.[0];
    return cat ? {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      projectId: cat.project_id
    } : null;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('expense_categories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * SETTINGS SERVICE
 */
export const settingsService = {
  async get(key: string) {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .single();
    // Gracefully handle not found error, return null
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return data?.value || null;
  },

  async set(key: string, value: string) {
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select();
    if (error) throw error;
    return data?.[0];
  },
};

/**
 * DOCUMENTS SERVICE
 */
export const documentsService = {
  // Function to get documents for a specific customer
  async getForCustomer(customerId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Function to get documents for a specific booking
  async getForBooking(bookingId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('booking_id', bookingId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Function to get documents for a specific sale
  async getForSale(saleId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('sale_id', saleId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Function to get a signed URL for a document
  async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
    if (!storagePath) {
      return null;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, expiresIn);
      
      if (error) {
        // لا نرمي خطأ، فقط نُرجع null للملفات غير الموجودة
        return null;
      }
      return data.signedUrl;
    } catch {
      return null;
    }
  },

  // ✅ جلب signed URLs متعددة دفعة واحدة - أسرع بكثير
  async getSignedUrls(storagePaths: string[], expiresIn: number = 3600): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // تصفية المسارات الفارغة
    const validPaths = storagePaths.filter(p => p && p.trim());
    
    if (validPaths.length === 0) {
      return results;
    }
    
    try {
      // Supabase يدعم createSignedUrls للحصول على عدة URLs دفعة واحدة
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrls(validPaths, expiresIn);
      
      if (error) {
        console.error('Error getting signed URLs:', error);
        // في حالة الخطأ، إرجاع null لكل مسار
        validPaths.forEach(path => results.set(path, null));
        return results;
      }
      
      // تخزين النتائج
      data?.forEach((item, index) => {
        if (item.error) {
          results.set(validPaths[index], null);
        } else {
          results.set(validPaths[index], item.signedUrl);
        }
      });
      
      return results;
    } catch (err) {
      console.error('Exception getting signed URLs:', err);
      validPaths.forEach(path => results.set(path, null));
      return results;
    }
  },

  // Function to upload a file and create a document record
  async upload(file: File, linkedTo: { customer_id?: string; booking_id?: string; sale_id?: string; expense_id?: string; project_id?: string | null; allow_unlinked?: boolean }) {
    // السماح بالمستندات غير المرتبطة إذا تم تمرير allow_unlinked = true
    if (!linkedTo.allow_unlinked && !linkedTo.customer_id && !linkedTo.booking_id && !linkedTo.sale_id && !linkedTo.expense_id) {
      throw new Error('Document must be linked to a customer, booking, sale, or expense.');
    }

    // استخراج الحقول الفعلية فقط (بدون allow_unlinked)
    const { allow_unlinked, ...dbFields } = linkedTo;

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    
    // ✅ تنظيم الملفات في مجلدات حسب المشروع
    const projectFolder = linkedTo.project_id || 'general';
    
    // ✅ استخدام اسم الملف الأصلي مع timestamp لتجنب التداخل
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedFileName}`;
    const filePath = `${projectFolder}/${fileName}`;

    // 1. Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // 2. Create a record in the 'documents' table
    const id = generateUniqueId('doc');
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        id,
        ...dbFields,
        file_name: file.name,
        storage_path: filePath,
        file_type: file.type,
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to remove the uploaded file
      await supabase.storage.from('documents').remove([filePath]);
      throw dbError;
    }

    // Map snake_case to camelCase
    return {
      id: data.id,
      customerId: data.customer_id,
      bookingId: data.booking_id,
      saleId: data.sale_id,
      expenseId: data.expense_id,
      projectId: data.project_id,
      fileName: data.file_name,
      storagePath: data.storage_path,
      fileType: data.file_type,
      uploadedAt: data.uploaded_at,
    };
  },

  // Function to get documents for a specific expense
  async getForExpense(expenseId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('expense_id', expenseId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      expenseId: doc.expense_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Fast helper: check which expenseIds have at least one linked document.
  // This avoids issuing one request per expense.
  async getExpenseIdsWithDocuments(expenseIds: string[]) {
    const ids = Array.from(new Set((expenseIds || []).filter(Boolean)));
    const result = new Set<string>();
    if (ids.length === 0) return result;

    // Keep the chunk size conservative to avoid URL/header limits.
    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from('documents')
        .select('expense_id')
        .in('expense_id', chunk);
      if (error) throw error;

      for (const row of data || []) {
        if (row?.expense_id) {
          result.add(String(row.expense_id));
        }
      }
    }

    return result;
  },

  // Function to get all unlinked documents (no expense_id)
  async getUnlinkedDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .is('expense_id', null)
      .is('customer_id', null)
      .is('booking_id', null)
      .is('sale_id', null)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      expenseId: doc.expense_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Function to get all accounting documents (linked and unlinked)
  async getAllAccountingDocuments(projectId?: string | null) {
    // ✅ جلب كل مستندات الحسابات (المرتبطة وغير المرتبطة)
    // الشرط: ليس لها booking_id أو customer_id أو sale_id (أي ليست مستندات مبيعات/حجوزات/عملاء)
    let query = supabase
      .from('documents')
      .select('*')
      .is('customer_id', null)
      .is('booking_id', null)
      .is('sale_id', null);
    
    // Filter by project if specified
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query.order('uploaded_at', { ascending: false });
    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(doc => ({
      id: doc.id,
      customerId: doc.customer_id,
      bookingId: doc.booking_id,
      saleId: doc.sale_id,
      expenseId: doc.expense_id,
      projectId: doc.project_id,
      fileName: doc.file_name,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      uploadedAt: doc.uploaded_at,
    }));
  },

  // Function to upload a file for an expense (Base64)
  async uploadForExpense(expenseId: string, fileName: string, base64Content: string, mimeType: string, projectId?: string | null) {
    // Convert base64 to blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    // Upload using existing method with project_id
    return this.upload(file, { expense_id: expenseId, project_id: projectId });
  },

  // Function to upload an unlinked document (for accounting documents archive)
  async uploadUnlinkedDocument(fileName: string, base64Content: string, mimeType: string, projectId?: string | null) {
    // Convert base64 to blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    // Upload without linking to any entity - allow unlinked, with optional project_id
    return this.upload(file, { allow_unlinked: true, project_id: projectId || null });
  },

  // Function to link an existing document to an expense
  async linkToExpense(documentId: string, expenseId: string) {
    const { data, error } = await supabase
      .from('documents')
      .update({ expense_id: expenseId })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Function to unlink a document from an expense
  async unlinkFromExpense(documentId: string) {
    const { data, error } = await supabase
      .from('documents')
      .update({ expense_id: null })
      .eq('id', documentId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Function to delete a document record and the file from storage
  async delete(documentId: string) {
    // First, get the document record to find its storage path
    const { data: doc, error: getError } = await supabase
      .from('documents')
      .select('storage_path')
      .eq('id', documentId)
      .single();

    if (getError || !doc) {
      throw getError || new Error('Document not found.');
    }

    // 1. Delete the file from Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([doc.storage_path]);

    if (storageError) {
      // Log the error but proceed to delete the DB record anyway
      console.error('Storage file deletion failed, but proceeding to delete DB record:', storageError);
    }

    // 2. Delete the record from the 'documents' table
    const { error: dbError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      throw dbError;
    }
  },

  // Function to delete all documents for a booking
  async deleteForBooking(bookingId: string) {
    // Get all documents for this booking
    const documents = await this.getForBooking(bookingId);
    
    // Delete each document
    for (const doc of documents) {
      await this.delete(doc.id);
    }
  }
};

/**
 * ACCOUNTS SERVICE
 */
export const accountsService = {
  /**
   * جلب جميع الحسابات مع إمكانية الفلترة حسب المشروع
   * الحسابات المشتركة (project_id = NULL) تظهر دائماً
   * ✅ يتم جلب اسم المشروع من جدول projects
   */
  async getAll(filters?: { projectId?: string | null }): Promise<Account[]> {
    let query = supabase
      .from('accounts')
      .select(`
        *,
        projects:project_id (name)
      `)
      .order('created_at', { ascending: false });
    
    // فلترة: إظهار حسابات المشروع المحدد + الحسابات المشتركة (NULL)
    if (filters?.projectId) {
      query = query.or(`project_id.eq.${filters.projectId},project_id.is.null`);
    }
    
    const { data, error } = await query;
    
    // If table doesn't exist or column doesn't exist, return empty array
    if (error) {
      // Check if it's a column not found error
      if (error.message?.includes('project_id') || error.code === '42703') {
        // Try without project_id filter
        const { data: simpleData, error: simpleError } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (simpleError) {
          console.warn('Error loading accounts:', simpleError);
          return [];
        }
        
        return (simpleData || []).map(acc => ({
          id: acc.id,
          name: acc.name,
          type: acc.account_type as 'Bank' | 'Cash',
          initialBalance: acc.balance || 0,
        }));
      }
      
      if (error.code === 'PGRST205') {
        console.warn('Accounts table does not exist, returning empty array');
        return [];
      }
      throw error;
    }
    
    // Map database fields to frontend fields - مع اسم المشروع
    return (data || []).map((acc: any) => ({
      id: acc.id,
      name: acc.name,
      type: acc.account_type as 'Bank' | 'Cash',
      initialBalance: acc.balance || 0,
      projectId: acc.project_id,
      projectName: acc.projects?.name || null, // ✅ اسم المشروع من JOIN
      description: acc.description,
      isActive: acc.is_active ?? true,
      createdAt: acc.created_at,
    }));
  },

  /**
   * جلب حسابات مشروع معين
   */
  async getByProject(projectId: string): Promise<Account[]> {
    return this.getAll({ projectId });
  },

  async create(account: Omit<Account, 'id'>) {
    // Generate unique ID
    const id = generateUniqueId('account');
    
    // Build insert object with only base fields first
    const insertData: any = { 
      id,
      name: account.name,
      account_type: account.type,
      balance: account.initialBalance || 0,
    };
    
    // Add optional fields if provided
    if (account.projectId) insertData.project_id = account.projectId;
    if (account.description) insertData.description = account.description;
    
    const { data, error } = await supabase
      .from('accounts')
      .insert([insertData])
      .select('*')
      .single();
    
    if (error) {
      // If column doesn't exist, try with basic fields only
      if (error.message?.includes('project_id') || error.message?.includes('description')) {
        const { data: simpleData, error: simpleError } = await supabase
          .from('accounts')
          .insert([{ 
            id,
            name: account.name,
            account_type: account.type,
            balance: account.initialBalance || 0,
          }])
          .select('*')
          .single();
        
        if (simpleError) throw simpleError;
        
        return {
          id: simpleData.id,
          name: simpleData.name,
          type: simpleData.account_type as 'Bank' | 'Cash',
          initialBalance: simpleData.balance || 0,
        };
      }
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
      projectId: data.project_id,
      description: data.description,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
    };
  },

  async update(id: string, updates: Partial<Account>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.account_type = updates.type;
    if (updates.initialBalance !== undefined) dbUpdates.balance = updates.initialBalance;
    // Only add these if they're defined (may not exist in DB yet)
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    
    const { data, error } = await supabase
      .from('accounts')
      .update(dbUpdates)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      // If column doesn't exist, try with basic fields only
      if (error.message?.includes('project_id') || error.message?.includes('description') || error.message?.includes('is_active')) {
        const basicUpdates: any = {};
        if (updates.name !== undefined) basicUpdates.name = updates.name;
        if (updates.type !== undefined) basicUpdates.account_type = updates.type;
        if (updates.initialBalance !== undefined) basicUpdates.balance = updates.initialBalance;
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('accounts')
          .update(basicUpdates)
          .eq('id', id)
          .select('*')
          .single();
        
        if (simpleError) throw simpleError;
        
        return {
          id: simpleData.id,
          name: simpleData.name,
          type: simpleData.account_type as 'Bank' | 'Cash',
          initialBalance: simpleData.balance || 0,
        };
      }
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
      projectId: data.project_id,
      projectName: (data as any).projects?.name,
      description: data.description,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
    };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * الحصول على الصندوق الافتراضي للمشروع أو إنشاءه تلقائياً
   * هذه الدالة تستخدم لربط المصروفات والرواتب والدفعات تلقائياً بصندوق المشروع
   */
  async getOrCreateProjectCashbox(projectId: string, projectName?: string): Promise<Account> {
    // البحث عن صندوق المشروع (نوع Cash ومرتبط بالمشروع)
    const { data: existingAccounts, error: searchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_type', 'Cash')
      .limit(1);
    
    if (searchError && !searchError.message?.includes('project_id')) {
      throw searchError;
    }
    
    // إذا وجد صندوق، إرجاعه
    if (existingAccounts && existingAccounts.length > 0) {
      const acc = existingAccounts[0];
      return {
        id: acc.id,
        name: acc.name,
        type: 'Cash',
        initialBalance: acc.balance || 0,
        projectId: acc.project_id,
      };
    }
    
    // إذا لم يوجد صندوق، البحث عن صندوق مشترك
    const { data: sharedAccounts } = await supabase
      .from('accounts')
      .select('*')
      .is('project_id', null)
      .eq('account_type', 'Cash')
      .limit(1);
    
    if (sharedAccounts && sharedAccounts.length > 0) {
      const acc = sharedAccounts[0];
      return {
        id: acc.id,
        name: acc.name,
        type: 'Cash',
        initialBalance: acc.balance || 0,
      };
    }
    
    // إذا لم يوجد أي صندوق، إنشاء صندوق جديد للمشروع
    const newAccount = await this.create({
      name: `صندوق ${projectName || 'المشروع'}`,
      type: 'Cash',
      initialBalance: 0,
      projectId: projectId,
    });
    
    return newAccount;
  },

  /**
   * الحصول على الحساب البنكي الافتراضي للمشروع أو المشترك
   */
  async getOrCreateProjectBank(projectId: string, projectName?: string): Promise<Account> {
    // البحث عن حساب بنكي للمشروع
    const { data: existingAccounts, error: searchError } = await supabase
      .from('accounts')
      .select('*')
      .eq('project_id', projectId)
      .eq('account_type', 'Bank')
      .limit(1);
    
    if (searchError && !searchError.message?.includes('project_id')) {
      throw searchError;
    }
    
    if (existingAccounts && existingAccounts.length > 0) {
      const acc = existingAccounts[0];
      return {
        id: acc.id,
        name: acc.name,
        type: 'Bank',
        initialBalance: acc.balance || 0,
        projectId: acc.project_id,
      };
    }
    
    // البحث عن حساب بنكي مشترك
    const { data: sharedAccounts } = await supabase
      .from('accounts')
      .select('*')
      .is('project_id', null)
      .eq('account_type', 'Bank')
      .limit(1);
    
    if (sharedAccounts && sharedAccounts.length > 0) {
      const acc = sharedAccounts[0];
      return {
        id: acc.id,
        name: acc.name,
        type: 'Bank',
        initialBalance: acc.balance || 0,
      };
    }
    
    // إنشاء حساب بنكي جديد
    const newAccount = await this.create({
      name: `بنك ${projectName || 'المشروع'}`,
      type: 'Bank',
      initialBalance: 0,
      projectId: projectId,
    });
    
    return newAccount;
  },

  subscribe(callback: (accounts: Account[]) => void) {
    const subscription = supabase
      .channel('accounts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, () => {
        accountsService.getAll().then(callback).catch(console.error);
      })
      .subscribe();
    
    return subscription;
  }
};

/**
 * ACTIVITY LOG SERVICE
 */
export const activityLogService = {
  async getAll(interfaceMode?: 'projects' | 'expenses') {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (interfaceMode) {
      query = query.eq('interface_mode', interfaceMode);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async log(action: string, details?: string, userId?: string, interfaceMode?: 'projects' | 'expenses') {
    // Send only required fields; let DB defaults handle timestamp/created_at
    const payload: { action: string; details: string | null; user_id?: string; interface_mode?: string } = {
      action,
      details: details || null,
    };

    if (userId) {
      payload.user_id = userId;
    }
    
    if (interfaceMode) {
      payload.interface_mode = interfaceMode;
    }

    const { data, error } = await supabase
      .from('activity_logs')
      .insert([payload])
      .select();
    if (error) throw error;
    return data?.[0];
  }
};

// ============================================================================
// خدمات نظام الصلاحيات المتقدم
// ============================================================================

/**
 * USER PERMISSIONS SERVICE - صلاحيات المستخدمين على الموارد
 */
export const userPermissionsService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      resource: p.resource,
      canView: p.can_view,
      canCreate: p.can_create,
      canEdit: p.can_edit,
      canDelete: p.can_delete,
    }));
  },

  async setPermissions(userId: string, permissions: { resource: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }[]) {
    // حذف الصلاحيات القديمة
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

    // إضافة الصلاحيات الجديدة
    if (permissions.length > 0) {
      const { error } = await supabase
        .from('user_permissions')
        .insert(permissions.map(p => ({
          user_id: userId,
          resource: p.resource,
          can_view: p.canView,
          can_create: p.canCreate,
          can_edit: p.canEdit,
          can_delete: p.canDelete,
        })));
      if (error) throw error;
    }
  },

  async upsertPermission(userId: string, resource: string, permission: { canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean }) {
    const { data, error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        resource: resource,
        can_view: permission.canView,
        can_create: permission.canCreate,
        can_edit: permission.canEdit,
        can_delete: permission.canDelete,
      }, { onConflict: 'user_id,resource' })
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteByUserId(userId: string) {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
};

/**
 * USER MENU ACCESS SERVICE - القوائم المتاحة للمستخدم
 */
export const userMenuAccessService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_menu_access')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const result = (data || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      menuKey: m.menu_key,
      isVisible: m.is_visible,
    }));
    
    return result;
  },

  async setMenuAccess(userId: string, menuAccess: { menuKey: string; isVisible: boolean }[]) {
    // حذف القوائم القديمة
    const { error: deleteError } = await supabase
      .from('user_menu_access')
      .delete()
      .eq('user_id', userId);
    
    if (deleteError) throw deleteError;
    
    const dataToInsert = menuAccess.map(m => ({
      user_id: userId,
      menu_key: m.menuKey,
        is_visible: m.isVisible,
      }));
      
      const { error } = await supabase
        .from('user_menu_access')
        .insert(dataToInsert);
      
      if (error) throw error;
  },

  async upsertMenuAccess(userId: string, menuKey: string, isVisible: boolean) {
    const { data, error } = await supabase
      .from('user_menu_access')
      .upsert({
        user_id: userId,
        menu_key: menuKey,
        is_visible: isVisible,
      }, { onConflict: 'user_id,menu_key' })
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteByUserId(userId: string) {
    const { error } = await supabase
      .from('user_menu_access')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
};

/**
 * USER BUTTON ACCESS SERVICE - الأزرار المتاحة للمستخدم
 */
export const userButtonAccessService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_button_access')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((b: any) => ({
      id: b.id,
      userId: b.user_id,
      pageKey: b.page_key,
      buttonKey: b.button_key,
      isVisible: b.is_visible,
    }));
  },

  async setButtonAccess(userId: string, buttonAccess: { pageKey: string; buttonKey: string; isVisible: boolean }[]) {
    // حذف الأزرار القديمة
    await supabase
      .from('user_button_access')
      .delete()
      .eq('user_id', userId);

    // إضافة الأزرار الجديدة
    if (buttonAccess.length > 0) {
      const { error } = await supabase
        .from('user_button_access')
        .insert(buttonAccess.map(b => ({
          user_id: userId,
          page_key: b.pageKey,
          button_key: b.buttonKey,
          is_visible: b.isVisible,
        })));
      if (error) throw error;
    }
  },

  async deleteByUserId(userId: string) {
    const { error } = await supabase
      .from('user_button_access')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }
};

/**
 * USER PROJECT ASSIGNMENTS SERVICE - ربط المستخدمين بالمشاريع
 */
export const userProjectAssignmentsService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_project_assignments')
      .select(`
        *,
        projects:project_id (id, name)
      `)
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      projectId: a.project_id,
      projectName: a.projects?.name || '',
      interfaceMode: a.interface_mode,
      assignedAt: a.assigned_at,
      assignedBy: a.assigned_by,
    }));
  },

  async getByProjectId(projectId: string) {
    const { data, error } = await supabase
      .from('user_project_assignments')
      .select(`
        *,
        users:user_id (id, name, username, role)
      `)
      .eq('project_id', projectId);
    if (error) throw error;
    return (data || []).map((a: any) => ({
      id: a.id,
      userId: a.user_id,
      userName: a.users?.name || '',
      userRole: a.users?.role || '',
      projectId: a.project_id,
      interfaceMode: a.interface_mode,
      assignedAt: a.assigned_at,
      assignedBy: a.assigned_by,
    }));
  },

  async assign(userId: string, projectId: string, interfaceMode: 'projects' | 'expenses', assignedBy?: string) {
    const { data, error } = await supabase
      .from('user_project_assignments')
      .insert({
        user_id: userId,
        project_id: projectId,
        interface_mode: interfaceMode,
        assigned_by: assignedBy,
      })
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async unassign(userId: string, projectId: string, interfaceMode: 'projects' | 'expenses') {
    const { error } = await supabase
      .from('user_project_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .eq('interface_mode', interfaceMode);
    if (error) throw error;
  },

  async deleteByUserId(userId: string) {
    const { error } = await supabase
      .from('user_project_assignments')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },

  async deleteByProjectId(projectId: string) {
    const { error } = await supabase
      .from('user_project_assignments')
      .delete()
      .eq('project_id', projectId);
    if (error) throw error;
  }
};

/**
 * خدمة شاملة لجلب كل صلاحيات المستخدم دفعة واحدة
 */
export const userFullPermissionsService = {
  async getByUserId(userId: string) {
    try {
      const [menuAccess, buttonAccess, projectAssignments, resourcePermissions] = await Promise.all([
        userMenuAccessService.getByUserId(userId),
        userButtonAccessService.getByUserId(userId),
        userProjectAssignmentsService.getByUserId(userId),
        userPermissionsService.getByUserId(userId),
      ]);

      return {
        menuAccess,
        buttonAccess,
        projectAssignments,
        resourcePermissions,
      };
    } catch (error) {
      console.error('❌ Error in userFullPermissionsService.getByUserId:', error);
      throw error;
    }
  },
  async deleteByUserId(userId: string) {
    await Promise.all([
      userPermissionsService.deleteByUserId(userId),
      userMenuAccessService.deleteByUserId(userId),
      userButtonAccessService.deleteByUserId(userId),
      userProjectAssignmentsService.deleteByUserId(userId),
    ]);
  }
};

// ============================================================================
// خدمة الدفعات المجدولة - Scheduled Payments Service
// ============================================================================
import { ScheduledPayment, PaymentNotification } from '../../types';

export const scheduledPaymentsService = {
  /**
   * جلب جميع الدفعات المجدولة
   */
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

  /**
   * جلب الدفعات المجدولة لحجز معين
   */
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

  /**
   * جلب الدفعات المجدولة لعدة حجوزات مرة واحدة (لتجنب N+1)
   */
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

  /**
   * جلب الدفعات المستحقة (pending أو overdue)
   */
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

  /**
   * تحديث حالة دفعة مجدولة
   */
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

  /**
   * ربط دفعة فعلية بدفعة مجدولة
   */
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

  /**
   * فك ربط دفعة من الدفعات المجدولة (عند حذف الدفعة)
   * يبحث عن أي قسط مرتبط بهذه الدفعة ويعيده لحالة pending
   */
  async unlinkPayment(paymentId: string) {
    // البحث عن الأقساط المرتبطة بهذه الدفعة
    const { data: linkedScheduled, error: fetchError } = await supabase
      .from('scheduled_payments')
      .select('*')
      .eq('payment_id', paymentId);
    
    if (fetchError) {
      console.warn('Error fetching linked scheduled payments:', fetchError);
      return; // لا نرمي خطأ إذا لم نجد شيئاً
    }
    
    if (!linkedScheduled || linkedScheduled.length === 0) {
      return; // لا توجد أقساط مرتبطة
    }
    
    // إعادة كل قسط مرتبط لحالته الأصلية
    for (const sp of linkedScheduled) {
      const today = new Date().toISOString().split('T')[0];
      const dueDate = sp.due_date;
      
      // تحديد الحالة الجديدة بناءً على تاريخ الاستحقاق
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

  /**
   * إنشاء الدفعات المجدولة لحجز جديد
   * ✅ تم إصلاح مشكلة التقريب الحسابي لضمان تطابق المجموع مع السعر الإجمالي
   */
  async generateForBooking(
    bookingId: string,
    unitPrice: number,
    paymentPlanYears: 4 | 5,
    paymentFrequencyMonths: 1 | 2 | 3 | 4 | 5 | 6 | 12,
    startDate: string
  ) {
    // حساب المبالغ باستخدام دقة عالية
    const totalMonths = paymentPlanYears * 12;
    const totalInstallments = Math.ceil(totalMonths / paymentFrequencyMonths);
    
    // ✅ حساب مبلغ القسط الأساسي (بدون الأخير)
    // استخدام toFixed لضمان دقة التقريب لمنزلتين عشريتين
    const baseInstallmentAmount = parseFloat((unitPrice / totalInstallments).toFixed(2));
    
    // ✅ حساب مجموع الأقساط الأولى (ما عدا الأخير)
    const sumOfBaseInstallments = parseFloat((baseInstallmentAmount * (totalInstallments - 1)).toFixed(2));
    
    // ✅ القسط الأخير يساوي الفرق لضمان تطابق المجموع تماماً
    const lastInstallmentAmount = parseFloat((unitPrice - sumOfBaseInstallments).toFixed(2));
    
    // حساب المبلغ الشهري للعرض فقط
    const monthlyAmount = parseFloat((unitPrice / totalMonths).toFixed(2));
    const installmentAmount = parseFloat((monthlyAmount * paymentFrequencyMonths).toFixed(2));
    
    // حذف الدفعات السابقة إن وجدت
    await supabase
      .from('scheduled_payments')
      .delete()
      .eq('booking_id', bookingId);
    
    // إنشاء الدفعات الجديدة
    const scheduledPayments = [];
    let currentDate = new Date(startDate);
    let totalScheduled = 0;
    
    for (let i = 1; i <= totalInstallments; i++) {
      // ✅ القسط الأخير يأخذ القيمة المحسوبة خصيصاً لتعويض فرق التقريب
      const amount = (i === totalInstallments) ? lastInstallmentAmount : baseInstallmentAmount;
      totalScheduled = parseFloat((totalScheduled + amount).toFixed(2));
      
      scheduledPayments.push({
        id: `sched_${bookingId}_${i}_${Date.now()}`,
        booking_id: bookingId,
        installment_number: i,
        due_date: currentDate.toISOString().split('T')[0],
        amount: amount,
        status: 'pending',
        paid_amount: 0,
        notification_sent: false,
      });
      
      // الانتقال للشهر التالي
      currentDate.setMonth(currentDate.getMonth() + paymentFrequencyMonths);
    }
    
    // ✅ تحقق نهائي: التأكد من تطابق المجموع مع السعر الإجمالي
    if (Math.abs(totalScheduled - unitPrice) > 0.01) {
      console.error(`⚠️ تحذير: فرق في المجموع - المتوقع: ${unitPrice}, المحسوب: ${totalScheduled}`);
    }
    
    const { error } = await supabase
      .from('scheduled_payments')
      .insert(scheduledPayments);
    if (error) throw error;
    
    // تحديث بيانات الحجز
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

  /**
   * حذف جميع الدفعات المجدولة لحجز
   */
  async deleteByBookingId(bookingId: string) {
    const { error } = await supabase
      .from('scheduled_payments')
      .delete()
      .eq('booking_id', bookingId);
    if (error) throw error;
  },
};

// ============================================================================
// خدمة إشعارات الدفعات - Payment Notifications Service
// ============================================================================

export const paymentNotificationsService = {
  /**
   * جلب جميع الإشعارات
   */
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

  /**
   * جلب الإشعارات غير المقروءة
   */
  async getUnread(userId?: string) {
    let query = supabase
      .from('payment_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    
    // ✅ تم إصلاح ثغرة SQL Injection - استخدام استعلامات منفصلة بدلاً من or مع template string
    if (userId) {
      // التحقق من صحة userId
      const idPattern = /^[a-zA-Z0-9_-]+$/;
      if (!idPattern.test(userId)) {
        throw new Error('معرّف المستخدم غير صالح');
      }
      
      // ✅ جلب إشعارات المستخدم وإشعارات العامة
      const [userNotifs, generalNotifs] = await Promise.all([
        supabase
          .from('payment_notifications')
          .select('*')
          .eq('is_read', false)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('payment_notifications')
          .select('*')
          .eq('is_read', false)
          .is('user_id', null)
          .order('created_at', { ascending: false })
      ]);
      
      if (userNotifs.error) throw userNotifs.error;
      if (generalNotifs.error) throw generalNotifs.error;
      
      const allData = [...(userNotifs.data || []), ...(generalNotifs.data || [])];
      // ترتيب حسب التاريخ
      allData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      return allData.map((n: any) => ({
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

  /**
   * تحديث حالة القراءة
   */
  async markAsRead(id: string) {
    // ✅ التحقق من صحة ID
    const idPattern = /^[a-zA-Z0-9_-]+$/;
    if (!idPattern.test(id)) {
      throw new Error('معرّف الإشعار غير صالح');
    }
    
    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * تحديث جميع الإشعارات كمقروءة
   */
  async markAllAsRead(userId?: string) {
    // ✅ تم إصلاح ثغرة SQL Injection
    if (userId) {
      // التحقق من صحة userId
      const idPattern = /^[a-zA-Z0-9_-]+$/;
      if (!idPattern.test(userId)) {
        throw new Error('معرّف المستخدم غير صالح');
      }
      
      // ✅ تحديث إشعارات المستخدم وإشعارات العامة
      const [userUpdate, generalUpdate] = await Promise.all([
        supabase
          .from('payment_notifications')
          .update({ is_read: true })
          .eq('is_read', false)
          .eq('user_id', userId),
        supabase
          .from('payment_notifications')
          .update({ is_read: true })
          .eq('is_read', false)
          .is('user_id', null)
      ]);
      
      if (userUpdate.error) throw userUpdate.error;
      if (generalUpdate.error) throw generalUpdate.error;
      return;
    }
    
    const { error } = await supabase
      .from('payment_notifications')
      .update({ is_read: true })
      .eq('is_read', false);
    if (error) throw error;
  },

  /**
   * إنشاء إشعار جديد
   */
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

  /**
   * فحص الدفعات المستحقة وإنشاء إشعارات
   */
  async checkAndCreateNotifications() {
    // جلب الدفعات المستحقة خلال 3 أيام ولم يتم إشعارها
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
      
      // إنشاء الإشعار
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
      
      // تحديث حالة الإشعار في الدفعة المجدولة
      await supabase
        .from('scheduled_payments')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        })
        .eq('id', sp.id);
      
      createdCount++;
    }
    
    // تحديث حالة الدفعات المتأخرة
    await supabase
      .from('scheduled_payments')
      .update({ status: 'overdue', updated_at: new Date().toISOString() })
      .eq('status', 'pending')
      .lt('due_date', today);
    
    return createdCount;
  },
};

// ============================================================================
// خدمة الدفعات المؤجلة - Deferred Payments Service
// نظام منفصل تماماً عن الحركات المالية العادية
// ============================================================================

import { DeferredPayment, DeferredPaymentInstallment } from '../../types';

export const deferredPaymentsService = {
  /**
   * جلب جميع الحسابات الآجلة
   */
  async getAll(filters?: { projectId?: string | null }): Promise<DeferredPayment[]> {
    let query = supabase
      .from('deferred_accounts')
      .select(`
        *,
        projects:project_id (name),
        vendors:vendor_id (name)
      `)
      .order('created_at', { ascending: false });
    
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // إذا الجدول غير موجود، إرجاع مصفوفة فارغة
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        console.warn('جدول deferred_accounts غير موجود، يرجى إنشاءه');
        return [];
      }
      throw error;
    }
    
    return (data || []).map((dp: any) => ({
      id: dp.id,
      description: dp.description,
      projectId: dp.project_id,
      projectName: dp.projects?.name || '',
      vendorId: dp.vendor_id,
      vendorName: dp.vendors?.name || '',
      totalAmount: dp.total_amount || 0,
      amountPaid: dp.amount_paid || 0,
      dueDate: dp.due_date,
      status: dp.status || 'Pending',
      notes: dp.notes,
      createdAt: dp.created_at,
      updatedAt: dp.updated_at,
      createdBy: dp.created_by,
    }));
  },

  /**
   * جلب حساب آجل بالمعرف
   */
  async getById(id: string): Promise<DeferredPayment | null> {
    const { data, error } = await supabase
      .from('deferred_accounts')
      .select(`
        *,
        projects:project_id (name),
        vendors:vendor_id (name)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      id: data.id,
      description: data.description,
      projectId: data.project_id,
      projectName: data.projects?.name || '',
      vendorId: data.vendor_id,
      vendorName: data.vendors?.name || '',
      totalAmount: data.total_amount || 0,
      amountPaid: data.amount_paid || 0,
      dueDate: data.due_date,
      status: data.status || 'Pending',
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  /**
   * إنشاء حساب آجل جديد
   */
  async create(payment: Omit<DeferredPayment, 'id' | 'amountPaid' | 'status' | 'createdAt' | 'updatedAt'>): Promise<DeferredPayment> {
    const id = generateUniqueId('deferred');
    
    const { data, error } = await supabase
      .from('deferred_accounts')
      .insert([{
        id,
        description: payment.description,
        project_id: payment.projectId,
        vendor_id: payment.vendorId || null,
        total_amount: payment.totalAmount,
        amount_paid: 0,
        due_date: payment.dueDate || null,
        status: 'Pending',
        notes: payment.notes || null,
        created_by: payment.createdBy || null,
      }])
      .select(`
        *,
        projects:project_id (name),
        vendors:vendor_id (name)
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      description: data.description,
      projectId: data.project_id,
      projectName: data.projects?.name || '',
      vendorId: data.vendor_id,
      vendorName: data.vendors?.name || '',
      totalAmount: data.total_amount || 0,
      amountPaid: data.amount_paid || 0,
      dueDate: data.due_date,
      status: data.status || 'Pending',
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  /**
   * تحديث حساب آجل
   */
  async update(id: string, updates: Partial<DeferredPayment>): Promise<DeferredPayment | null> {
    const dbUpdates: any = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId || null;
    if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
    if (updates.amountPaid !== undefined) dbUpdates.amount_paid = updates.amountPaid;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate || null;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    dbUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('deferred_accounts')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        projects:project_id (name),
        vendors:vendor_id (name)
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      description: data.description,
      projectId: data.project_id,
      projectName: data.projects?.name || '',
      vendorId: data.vendor_id,
      vendorName: data.vendors?.name || '',
      totalAmount: data.total_amount || 0,
      amountPaid: data.amount_paid || 0,
      dueDate: data.due_date,
      status: data.status || 'Pending',
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by,
    };
  },

  /**
   * حذف حساب آجل وجميع دفعاته
   */
  async delete(id: string): Promise<void> {
    // أولاً: استرجاع الدفعات لإعادة الأرصدة للحسابات
    const installments = await deferredInstallmentsService.getByPaymentId(id);
    
    // إعادة الأرصدة للحسابات
    for (const inst of installments) {
      if (inst.accountId) {
        await deferredInstallmentsService._updateAccountBalance(inst.accountId, inst.amount, 'add');
      }
    }
    
    // حذف الدفعات
    await supabase
      .from('deferred_installments')
      .delete()
      .eq('deferred_account_id', id);
    
    // حذف الحساب الآجل
    const { error } = await supabase
      .from('deferred_accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  /**
   * تحديث حالة الحساب الآجل بناءً على المدفوعات
   */
  async _updateStatus(id: string): Promise<void> {
    const payment = await this.getById(id);
    if (!payment) return;
    
    let newStatus: DeferredPayment['status'] = 'Pending';
    if (payment.amountPaid >= payment.totalAmount) {
      newStatus = 'Paid';
    } else if (payment.amountPaid > 0) {
      newStatus = 'Partially Paid';
    }
    
    if (newStatus !== payment.status) {
      await this.update(id, { status: newStatus });
    }
  },
};

/**
 * خدمة دفعات/أقساط الحسابات الآجلة
 */
export const deferredInstallmentsService = {
  /**
   * جلب جميع الدفعات لحساب آجل معين
   */
  async getByPaymentId(deferredPaymentId: string): Promise<DeferredPaymentInstallment[]> {
    const { data, error } = await supabase
      .from('deferred_installments')
      .select(`
        *,
        accounts:account_id (name)
      `)
      .eq('deferred_account_id', deferredPaymentId)
      .order('payment_date', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }
    
    return (data || []).map((inst: any) => ({
      id: inst.id,
      deferredPaymentId: inst.deferred_account_id,
      paymentDate: inst.payment_date,
      amount: inst.amount,
      accountId: inst.account_id,
      accountName: inst.accounts?.name || '',
      notes: inst.notes,
      receiptNumber: inst.receipt_number,
      createdAt: inst.created_at,
      createdBy: inst.created_by,
    }));
  },

  /**
   * جلب جميع الدفعات لمشروع معين
   */
  async getByProject(projectId: string): Promise<DeferredPaymentInstallment[]> {
    const { data, error } = await supabase
      .from('deferred_installments')
      .select(`
        *,
        accounts:account_id (name),
        deferred_accounts:deferred_account_id (project_id, description)
      `)
      .order('payment_date', { ascending: false });
    
    if (error) {
      if (error.code === 'PGRST205') return [];
      throw error;
    }
    
    // فلترة حسب المشروع
    return (data || [])
      .filter((inst: any) => inst.deferred_accounts?.project_id === projectId)
      .map((inst: any) => ({
        id: inst.id,
        deferredPaymentId: inst.deferred_account_id,
        paymentDate: inst.payment_date,
        amount: inst.amount,
        accountId: inst.account_id,
        accountName: inst.accounts?.name || '',
        notes: inst.notes,
        receiptNumber: inst.receipt_number,
        createdAt: inst.created_at,
        createdBy: inst.created_by,
      }));
  },

  /**
   * إنشاء دفعة جديدة للحساب الآجل
   * ✅ يخصم من رصيد الحساب (الصندوق/البنك) مباشرة
   */
  async create(installment: Omit<DeferredPaymentInstallment, 'id' | 'createdAt'>): Promise<DeferredPaymentInstallment> {
    const id = generateUniqueId('dinst');
    
    // 1. إنشاء سجل الدفعة
    const { data, error } = await supabase
      .from('deferred_installments')
      .insert([{
        id,
        deferred_account_id: installment.deferredPaymentId,
        payment_date: installment.paymentDate,
        amount: installment.amount,
        account_id: installment.accountId,
        notes: installment.notes || null,
        receipt_number: installment.receiptNumber || null,
        created_by: installment.createdBy || null,
      }])
      .select(`
        *,
        accounts:account_id (name)
      `)
      .single();
    
    if (error) throw error;
    
    // 2. خصم من رصيد الحساب (الصندوق/البنك) - سحب
    await this._updateAccountBalance(installment.accountId, installment.amount, 'subtract');
    
    // 3. تحديث المبلغ المدفوع في الحساب الآجل
    await this._updateDeferredPaymentAmount(installment.deferredPaymentId, installment.amount, 'add');
    
    return {
      id: data.id,
      deferredPaymentId: data.deferred_account_id,
      paymentDate: data.payment_date,
      amount: data.amount,
      accountId: data.account_id,
      accountName: data.accounts?.name || '',
      notes: data.notes,
      receiptNumber: data.receipt_number,
      createdAt: data.created_at,
      createdBy: data.created_by,
    };
  },

  /**
   * حذف دفعة
   * ✅ يُعيد المبلغ لرصيد الحساب
   */
  async delete(id: string): Promise<void> {
    // جلب بيانات الدفعة أولاً
    const { data: installment, error: fetchError } = await supabase
      .from('deferred_installments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // حذف الدفعة
    const { error } = await supabase
      .from('deferred_installments')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // إعادة المبلغ لرصيد الحساب (إيداع)
    await this._updateAccountBalance(installment.account_id, installment.amount, 'add');
    
    // تحديث المبلغ المدفوع في الحساب الآجل
    await this._updateDeferredPaymentAmount(installment.deferred_account_id, installment.amount, 'subtract');
  },

  /**
   * تحديث رصيد الحساب (الصندوق/البنك)
   * @param operation 'add' للإيداع، 'subtract' للسحب
   */
  async _updateAccountBalance(accountId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    // جلب الرصيد الحالي
    const { data: account, error: fetchError } = await supabase
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentBalance = account?.balance || 0;
    const newBalance = operation === 'add' 
      ? currentBalance + amount 
      : currentBalance - amount;
    
    // تحديث الرصيد
    const { error: updateError } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId);
    
    if (updateError) throw updateError;
  },

  /**
   * تحديث المبلغ المدفوع في الحساب الآجل
   */
  async _updateDeferredPaymentAmount(deferredPaymentId: string, amount: number, operation: 'add' | 'subtract'): Promise<void> {
    // جلب البيانات الحالية
    const { data: dp, error: fetchError } = await supabase
      .from('deferred_accounts')
      .select('amount_paid, total_amount')
      .eq('id', deferredPaymentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    const currentPaid = dp?.amount_paid || 0;
    const totalAmount = dp?.total_amount || 0;
    const newPaid = operation === 'add' 
      ? currentPaid + amount 
      : Math.max(0, currentPaid - amount);
    
    // تحديد الحالة الجديدة
    let newStatus: DeferredPayment['status'] = 'Pending';
    if (newPaid >= totalAmount) {
      newStatus = 'Paid';
    } else if (newPaid > 0) {
      newStatus = 'Partially Paid';
    }
    
    // تحديث
    const { error: updateError } = await supabase
      .from('deferred_accounts')
      .update({ 
        amount_paid: newPaid,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', deferredPaymentId);
    
    if (updateError) throw updateError;
  },
};
