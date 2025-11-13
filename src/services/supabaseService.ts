import { supabase } from '../lib/supabase';
import { Customer, Unit, Booking, Payment, Expense, Transaction, Employee, UnitSaleRecord, Project, Vendor, ExpenseCategory, Account, User, UnitType, UnitStatus } from '../../types';

/**
 * USERS SERVICE
 */
export const usersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(user: Omit<User, 'id'>) {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, user: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(user)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
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
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(unit: Omit<Unit, 'id'>) {
    const { data, error } = await supabase
      .from('units')
      .insert([unit])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, unit: Partial<Unit>) {
    const { data, error } = await supabase
      .from('units')
      .update(unit)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(booking: Omit<Booking, 'id'>) {
    const { data, error } = await supabase
      .from('bookings')
      .insert([booking])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, booking: Partial<Booking>) {
    const { data, error } = await supabase
      .from('bookings')
      .update(booking)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(payment: Omit<Payment, 'id'>) {
    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, payment: Partial<Payment>) {
    const { data, error } = await supabase
      .from('payments')
      .update(payment)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
  async getAll() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(expense: Omit<Expense, 'id'>) {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, expense: Partial<Expense>) {
    const { data, error } = await supabase
      .from('expenses')
      .update(expense)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
export const transactionsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(transaction: Omit<Transaction, 'id'>) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async update(id: string, transaction: Partial<Transaction>) {
    const { data, error } = await supabase
      .from('transactions')
      .update(transaction)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
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
  async getAll() {
    const { data, error } = await supabase
      .from('unit_sales')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(sale: Omit<UnitSaleRecord, 'id'>) {
    const { data, error } = await supabase
      .from('unit_sales')
      .insert([sale])
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
    const { data, error } = await supabase
      .from('employees')
      .insert([employee])
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
    const { data, error } = await supabase
      .from('projects')
      .insert([project])
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
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendor])
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
    const { data, error } = await supabase
      .from('unit_types')
      .insert([item])
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
    const { data, error } = await supabase
      .from('unit_statuses')
      .insert([item])
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
    const { data, error } = await supabase
      .from('expense_categories')
      .insert([item])
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
