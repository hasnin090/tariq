import { supabase } from '../lib/supabase';
import { Customer, Unit, Booking, Payment, Expense, Transaction, Employee, UnitSaleRecord, Project, Vendor, ExpenseCategory, Account, User, UnitType, UnitStatus, Document } from '../../types';

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
  return crypto.randomUUID();
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
    // Generate UUID for user (users table uses UUID type)
    const id = generateUUID();
    
    // Extract fields
    const { password, projectAssignments, permissions, ...userWithoutPassword } = user as any;
    
    // Only include valid database columns (permissions is not stored in DB, derived from role)
    const cleanUserData = {
      name: userWithoutPassword.name,
      username: userWithoutPassword.username,
      email: userWithoutPassword.email || null,
      role: userWithoutPassword.role,
      password: password || '123456' // Default password if not provided
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...cleanUserData, id }])
      .select('id, name, username, email, role')
      .single();
    
    if (error) {
      console.error('Supabase create user error:', error);
      
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
    
    // Build update data (include password if provided)
    const updateData: any = { ...userWithoutPassword };
    if (password && password.trim()) {
      updateData.password = password;
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
    
    return data || [];
  },

  async create(customer: Omit<Customer, 'id'>) {
    const id = generateUniqueId('customer');
    const { data, error } = await supabase
      .from('customers')
      .insert([{ ...customer, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
      .select('*, customers(name)')
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
      customerName: unit.customers?.name || '',
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
      customer_id: (unit as any).customerId || null,
      project_id: (unit as any).projectId || null,
    };
    
    const { data, error } = await supabase
      .from('units')
      .insert([dbUnit])
      .select('*, customers(name)');
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        name: data[0].unit_number,
        type: data[0].type,
        status: data[0].status,
        price: data[0].price,
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || '',
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
    if ((unit as any).customerId !== undefined) dbUnit.customer_id = (unit as any).customerId;
    if ((unit as any).projectId !== undefined) dbUnit.project_id = (unit as any).projectId;
    
    const { data, error } = await supabase
      .from('units')
      .update(dbUnit)
      .eq('id', id)
      .select('*, customers(name)');
    if (error) throw error;
    
    if (data?.[0]) {
      return {
        id: data[0].id,
        name: data[0].unit_number,
        type: data[0].type,
        status: data[0].status,
        price: data[0].price,
        customerId: data[0].customer_id,
        customerName: data[0].customers?.name || '',
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
      amount_paid: (booking as any).amount_paid || booking.amountPaid,
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
      .order('payment_date', { ascending: false });
    if (paymentsError) throw paymentsError;
    
    // Get all bookings to map customer data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, unit_id, customers(name), units(unit_number)');
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
    
    // Transform payments with enriched booking and unit data
    return (payments || []).map((payment: any) => {
      const booking = bookingMap.get(payment.booking_id);
      const unit = booking ? unitMap.get(booking.unit_id) : null;
      const unitPrice = unit?.price || 0;
      
      return {
        id: payment.id,
        bookingId: payment.booking_id,
        customerId: booking?.customer_id,
        customerName: booking?.customer_name,
        unitId: booking?.unit_id,
        unitName: booking?.unit_name,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        unitPrice: unitPrice,
        remainingAmount: unitPrice - payment.amount,
        accountId: undefined,
        transactionId: undefined,
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
    
    // Get all bookings to map customer_id
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, customer_id, unit_id, customers(name), units(unit_number)');
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
        
        return {
          id: payment.id,
          bookingId: payment.booking_id,
          customerId: booking?.customer_id,
          customerName: booking?.customer_name,
          unitId: booking?.unit_id,
          unitName: booking?.unit_name,
          amount: payment.amount,
          paymentDate: payment.payment_date,
          unitPrice: unitPrice,
          remainingAmount: unitPrice - payment.amount,
          accountId: undefined,
          transactionId: undefined,
        };
      });
  },

  async create(payment: Omit<Payment, 'id' | 'remainingAmount'>) {
    const id = generateUniqueId('payment');
    
    // Only insert columns that exist in payments table
    const dbData = {
      id,
      booking_id: payment.bookingId,
      amount: payment.amount,
      payment_date: payment.paymentDate,
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
        unitPrice: unitPrice,
        remainingAmount: unitPrice - data[0].amount,
        accountId: payment.accountId,
        transactionId: payment.transactionId,
      };
    }
  },

  async update(id: string, payment: Partial<Payment>) {
    // Only update columns that exist in payments table
    const dbData: any = {};
    if (payment.bookingId !== undefined) dbData.booking_id = payment.bookingId;
    if (payment.amount !== undefined) dbData.amount = payment.amount;
    if (payment.paymentDate !== undefined) dbData.payment_date = payment.paymentDate;
    
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
        unitPrice: unitPrice,
        remainingAmount: unitPrice - data[0].amount,
        accountId: payment.accountId,
        transactionId: payment.transactionId,
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
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Map database fields to frontend fields
    return (data || []).map(exp => ({
      id: exp.id,
      date: exp.expense_date,
      description: exp.description,
      amount: exp.amount,
      categoryId: exp.category_id,
      projectId: exp.project_id,
      accountId: exp.account_id,
      vendorId: exp.vendor_id,
    }));
  },

  async create(expense: Omit<Expense, 'id'>) {
    const id = generateUniqueId('expense');
    
    // Convert camelCase to snake_case for database
    const dbExpense = {
      id,
      expense_date: expense.date,
      description: expense.description,
      amount: expense.amount,
      category_id: expense.categoryId || null, // Convert empty string to null
      project_id: expense.projectId || null,
      account_id: expense.accountId || null,   // Convert empty string to null
      vendor_id: expense.vendorId || null,
    };
    
    const { data, error } = await supabase
      .from('expenses')
      .insert([dbExpense])
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
      transactionId: expense.transactionId, // Keep from input for frontend use
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
    return data || [];
  },

  async create(project: Omit<Project, 'id'>) {
    const id = generateUniqueId('project');
    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, id }])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, project: Partial<Project>) {
    const { data, error } = await supabase
      .from('projects')
      .update(project)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
  async upload(file: File, linkedTo: { customer_id?: string; booking_id?: string; sale_id?: string }) {
    if (!linkedTo.customer_id && !linkedTo.booking_id && !linkedTo.sale_id) {
      throw new Error('Document must be linked to a customer, booking, or sale.');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
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
  async getAll() {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async log(action: string, details?: string, userId?: string) {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        action,
        details: details || null,
        user_id: userId || null,
        timestamp: new Date().toISOString()
      }])
      .select();
    if (error) throw error;
    return data?.[0];
  }
};
