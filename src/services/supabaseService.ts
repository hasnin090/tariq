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
  sanitizeText,
  ValidationError 
} from '../../utils/validation';

/**
 * HELPER: Generate unique ID
 */
const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}_${counter}`;
};

/**
 * HELPER: Generate UUID v4
 */
const generateUUID = (): string => {
  // Fallback for browsers that don't support crypto.randomUUID()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
    const { data, error } = await supabase
      .from('users')
      .select('*')
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
    
    // Hash password before storing (use default password if not provided)
    const plainPassword = password || '123456';
    const hashedPassword = await hashPassword(plainPassword);
    
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
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Transform snake_case to camelCase
    // Note: Units don't have direct customer relationship - that's through bookings
    return (data || []).map((unit: any) => ({
      id: unit.id,
      name: unit.unit_number,
      type: unit.type,
      status: unit.status,
      price: unit.price,
      projectId: unit.project_id,
    }));
  },

  async create(unit: Omit<Unit, 'id'>) {
    const id = generateUniqueId('unit');
    
    // Transform camelCase to snake_case for database
    // Note: customer_id should NOT be set here - units don't have direct customer relationship
    // Customer relationship is through bookings table
    const dbUnit: any = {
      id,
      unit_number: unit.name,
      type: unit.type,
      status: unit.status,
      price: unit.price,
      project_id: (unit as any).projectId || null,
    };
    
    console.log('🔵 Creating unit with data:', dbUnit);
    
    const { data, error } = await supabase
      .from('units')
      .insert([dbUnit])
      .select();
    
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
        projectId: data[0].project_id,
      };
    }
  },

  async update(id: string, unit: Partial<Unit>) {
    // Transform camelCase to snake_case for database
    // Note: customer_id should NOT be updated here - units don't have direct customer relationship
    const dbUnit: any = {};
    if (unit.name !== undefined) dbUnit.unit_number = unit.name;
    if (unit.type !== undefined) dbUnit.type = unit.type;
    if (unit.status !== undefined) dbUnit.status = unit.status;
    if (unit.price !== undefined) dbUnit.price = unit.price;
    if ((unit as any).projectId !== undefined) dbUnit.project_id = (unit as any).projectId;
    
    const { data, error } = await supabase
      .from('units')
      .update(dbUnit)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        name: data[0].unit_number,
        type: data[0].type,
        status: data[0].status,
        price: data[0].price,
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
    }));
  },

  async create(booking: Omit<Booking, 'id'>) {
    const id = generateUniqueId('booking');
    
    // Transform to snake_case for database
    const dbData = {
      id,
      unit_id: (booking as any).unit_id || booking.unitId,
      customer_id: (booking as any).customer_id || booking.customerId,
      booking_date: (booking as any).booking_date || booking.bookingDate,
      total_price: (booking as any).total_price || (booking as any).totalPrice || 0, // حقل مطلوب في قاعدة البيانات
      amount_paid: (booking as any).amount_paid || booking.amountPaid || 0,
      status: booking.status || 'Active',
    };
    
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
    
    // Create maps for efficient lookup
    const bookingMap = new Map();
    (bookings || []).forEach((booking: any) => {
      bookingMap.set(booking.id, {
        ...booking,
        customer_name: booking.customers?.name,
        unit_name: booking.units?.name
      });
    });
    
    const unitMap = new Map();
    (units || []).forEach(unit => {
      unitMap.set(unit.id, unit);
    });
    
    // Calculate total paid per booking (booking amount + additional payments)
    const totalPaidPerBooking = new Map();
    (bookings || []).forEach((booking: any) => {
      totalPaidPerBooking.set(booking.id, booking.amount_paid || 0);
    });
    
    (payments || []).forEach((payment: any) => {
      const current = totalPaidPerBooking.get(payment.booking_id) || 0;
      totalPaidPerBooking.set(payment.booking_id, current + payment.amount);
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
    // Get all payments first, then filter by customer via bookings
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false });
    if (paymentsError) throw paymentsError;
    
    // Get all bookings to map customer_id and initial payment
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, unit_id, amount_paid, customers(name), units(unit_number)');
    if (bookingsError) throw bookingsError;
    
    // Get all units to map unit_price
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select('id, price');
    if (unitsError) throw unitsError;
    
    // Create maps for efficient lookup
    const bookingMap = new Map();
    (bookings || []).forEach((booking: any) => {
      bookingMap.set(booking.id, {
        ...booking,
        customer_name: booking.customers?.name,
        unit_name: booking.units?.name
      });
    });
    
    const unitMap = new Map();
    (units || []).forEach(unit => {
      unitMap.set(unit.id, unit);
    });
    
    // Calculate total paid per booking (booking amount + additional payments)
    const totalPaidPerBooking = new Map();
    (bookings || []).forEach((booking: any) => {
      if (booking.customer_id === customerId) {
        totalPaidPerBooking.set(booking.id, booking.amount_paid || 0);
      }
    });
    
    (payments || []).forEach((payment: any) => {
      const booking = bookingMap.get(payment.booking_id);
      if (booking && booking.customer_id === customerId) {
        const current = totalPaidPerBooking.get(payment.booking_id) || 0;
        totalPaidPerBooking.set(payment.booking_id, current + payment.amount);
      }
    });
    
    // Filter payments by customer and enrich with booking and unit data
    return (payments || [])
      .filter((payment: any) => {
        const booking = bookingMap.get(payment.booking_id);
        return booking && booking.customer_id === customerId;
      })
      .map((payment: any) => {
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
      .select('customer_id, unit_id, customers(name), units(unit_number)')
      .eq('id', payment.bookingId)
      .single();
    
    // Get unit price
    const { data: unit, error: unitError } = await supabase
      .from('units')
      .select('price')
      .eq('id', booking?.unit_id)
      .single();
    
    const unitPrice = unit?.price || 0;
    
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
        remainingAmount: unitPrice - data[0].amount,
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
        remainingAmount: unitPrice - data[0].amount,
        accountId: payment.accountId,
        notes: payment.notes,
      };
    }
  },

  async delete(id: string) {
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
    
    console.log('🔵 Creating expense with data:', dbExpense);
    
    const { error } = await supabase
      .from('expenses')
      .insert(dbExpense);
    
    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }
    
    console.log('✅ Expense inserted successfully, fetching data...');
    
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
    const dbUpdate: any = {};
    if (expense.date !== undefined) dbUpdate.expense_date = expense.date;
    if (expense.description !== undefined) dbUpdate.description = expense.description;
    if (expense.amount !== undefined) dbUpdate.amount = expense.amount;
    if (expense.categoryId !== undefined) dbUpdate.category_id = expense.categoryId;
    if (expense.projectId !== undefined) dbUpdate.project_id = expense.projectId;
    if (expense.accountId !== undefined) dbUpdate.account_id = expense.accountId;
    if (expense.vendorId !== undefined) dbUpdate.vendor_id = expense.vendorId;
    if (expense.transactionId !== undefined) dbUpdate.transaction_id = expense.transactionId;
    if (expense.deferredPaymentInstallmentId !== undefined) dbUpdate.deferred_payment_installment_id = expense.deferredPaymentInstallmentId;
    if (expense.employeeId !== undefined) dbUpdate.employee_id = expense.employeeId;
    
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
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
  sourceId: dbTransaction.source_id,
  sourceType: dbTransaction.source_type
});

export const transactionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
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
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

/**
 * UNIT SALES SERVICE
 */
export const unitSalesService = {
  async getAll(): Promise<UnitSaleRecord[]> {
    const { data, error } = await supabase
      .from('unit_sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map database fields to frontend fields
    return (data || []).map(sale => ({
      id: sale.id,
      unitId: sale.unit_id || '',
      unitName: sale.unit_name || '',
      customerId: sale.customer_id || '',
      customerName: sale.customer_name || '',
      salePrice: sale.sale_price || 0,
      finalSalePrice: sale.final_sale_price || 0,
      saleDate: sale.sale_date || '',
      documents: sale.documents || [],
      accountId: sale.account_id || '',
      transactionId: sale.transaction_id,
      projectId: sale.project_id,
    }));
  },

  async create(sale: Omit<UnitSaleRecord, 'id'>) {
    const id = generateUniqueId('sale');
    const { data, error } = await supabase
      .from('unit_sales')
      .insert([{ ...sale, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, sale: Partial<UnitSaleRecord>) {
    const { data, error } = await supabase
      .from('unit_sales')
      .update(sale)
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
 */
export const employeesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(employee: Omit<Employee, 'id'>) {
    const id = generateUniqueId('emp');
    const { data, error } = await supabase
      .from('employees')
      .insert([{ ...employee, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, employee: Partial<Employee>) {
    const { data, error } = await supabase
      .from('employees')
      .update(employee)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
    return data || [];
  },

  async create(item: Omit<ExpenseCategory, 'id'>) {
    const id = generateUniqueId('cat');
    const { data, error } = await supabase
      .from('expense_categories')
      .insert([{ ...item, id }])
      .select();
    if (error) throw error;
    return data?.[0];
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
  async getSignedUrl(storagePath: string, expiresIn: number = 3600) {
    if (!storagePath) {
      throw new Error('Storage path is required');
    }
    
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresIn);
    
    if (error) throw error;
    return data.signedUrl;
  },

  // Function to upload a file and create a document record
  async upload(file: File, linkedTo: { customer_id?: string; booking_id?: string; sale_id?: string; expense_id?: string }) {
    if (!linkedTo.customer_id && !linkedTo.booking_id && !linkedTo.sale_id && !linkedTo.expense_id) {
      throw new Error('Document must be linked to a customer, booking, sale, or expense.');
    }

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const fileName = `${timestamp}_${randomStr}.${fileExt}`;
    const filePath = fileName;

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
        ...linkedTo,
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
  async getAllAccountingDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or('expense_id.not.is.null,and(customer_id.is.null,booking_id.is.null,sale_id.is.null)')
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

  // Function to upload a file for an expense (Base64)
  async uploadForExpense(expenseId: string, fileName: string, base64Content: string, mimeType: string) {
    // Convert base64 to blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const file = new File([blob], fileName, { type: mimeType });

    // Upload using existing method
    return this.upload(file, { expense_id: expenseId });
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
  async getAll(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
    // If table doesn't exist, return empty array
    if (error && error.code === 'PGRST205') {
      console.warn('Accounts table does not exist, returning empty array');
      return [];
    }
    if (error) throw error;
    
    // Map database fields to frontend fields
    return (data || []).map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.account_type as 'Bank' | 'Cash',
      initialBalance: acc.balance || 0,
    }));
  },

  async create(account: Omit<Account, 'id'>) {
    // Generate unique ID
    const id = generateUniqueId('account');
    
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ 
        id,
        name: account.name,
        account_type: account.type,
        balance: account.initialBalance || 0,
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
    };
  },

  async update(id: string, updates: Partial<Account>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.account_type = updates.type;
    if (updates.initialBalance !== undefined) dbUpdates.balance = updates.initialBalance;
    
    const { data, error } = await supabase
      .from('accounts')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
    };
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
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
      console.log('📥 Inserting menu access:', dataToInsert);
      
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
    console.log('📥 userFullPermissionsService.getByUserId called for:', userId);
    try {
      const [menuAccess, buttonAccess, projectAssignments] = await Promise.all([
        userMenuAccessService.getByUserId(userId),
        userButtonAccessService.getByUserId(userId),
        userProjectAssignmentsService.getByUserId(userId),
      ]);

      return {
        menuAccess,
        buttonAccess,
        projectAssignments,
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
   * إنشاء الدفعات المجدولة لحجز جديد
   */
  async generateForBooking(
    bookingId: string,
    unitPrice: number,
    paymentPlanYears: 4 | 5,
    paymentFrequencyMonths: 1 | 2 | 3 | 4 | 5,
    startDate: string
  ) {
    // حساب المبالغ
    const totalMonths = paymentPlanYears * 12;
    const monthlyAmount = Math.round((unitPrice / totalMonths) * 100) / 100;
    const installmentAmount = Math.round((monthlyAmount * paymentFrequencyMonths) * 100) / 100;
    const totalInstallments = Math.ceil(totalMonths / paymentFrequencyMonths);
    
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
      // الدفعة الأخيرة تعوض فرق التقريب
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
      
      // الانتقال للشهر التالي
      currentDate.setMonth(currentDate.getMonth() + paymentFrequencyMonths);
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

  /**
   * تحديث حالة القراءة
   */
  async markAsRead(id: string) {
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
