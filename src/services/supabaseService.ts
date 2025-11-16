import { supabase } from '../lib/supabase';
import { Customer, Unit, Booking, Payment, Expense, Transaction, Employee, UnitSaleRecord, Project, Vendor, ExpenseCategory, Account, User, UnitType, UnitStatus, Document } from '../../types';

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
    const id = `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(unit: Omit<Unit, 'id'>) {
    const id = `unit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await supabase
      .from('units')
      .insert([{ ...unit, id }])
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
    
    // Transform snake_case to camelCase
    return (data || []).map((booking: any) => ({
      id: booking.id,
      unitId: booking.unit_id,
      unitName: booking.unit_name,
      customerId: booking.customer_id,
      customerName: booking.customer_name,
      bookingDate: booking.booking_date,
      amountPaid: booking.amount_paid,
      status: booking.status,
    }));
  },

  async create(booking: Omit<Booking, 'id'>) {
    const id = `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Transform to snake_case for database
    const dbData = {
      id,
      unit_id: (booking as any).unit_id || booking.unitId,
      customer_id: (booking as any).customer_id || booking.customerId,
      booking_date: (booking as any).booking_date || booking.bookingDate,
      amount_paid: (booking as any).amount_paid || booking.amountPaid,
      unit_name: (booking as any).unit_name || booking.unitName,
      customer_name: (booking as any).customer_name || booking.customerName,
      status: booking.status || 'Active',
    };
    
    const { data, error } = await supabase
      .from('bookings')
      .insert([dbData])
      .select();
    if (error) throw error;
    
    // Transform response back to camelCase
    if (data?.[0]) {
      return {
        id: data[0].id,
        unitId: data[0].unit_id,
        unitName: data[0].unit_name,
        customerId: data[0].customer_id,
        customerName: data[0].customer_name,
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
      else if (key === 'unitName') dbData.unit_name = value;
      else if (key === 'customerName') dbData.customer_name = value;
      else if (key !== 'id') dbData[key] = value;
    });
    
    const { data, error } = await supabase
      .from('bookings')
      .update(dbData)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    // Transform response back to camelCase
    if (data?.[0]) {
      return {
        id: data[0].id,
        unitId: data[0].unit_id,
        unitName: data[0].unit_name,
        customerId: data[0].customer_id,
        customerName: data[0].customer_name,
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
      .select('*')
      .eq('unit_id', unitId);
    if (error) throw error;
    
    // Transform snake_case to camelCase
    return (data || []).map((booking: any) => ({
      id: booking.id,
      unitId: booking.unit_id,
      unitName: booking.unit_name,
      customerId: booking.customer_id,
      customerName: booking.customer_name,
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
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    // Transform snake_case to camelCase
    return (data || []).map((payment: any) => ({
      id: payment.id,
      bookingId: payment.booking_id,
      customerId: payment.customer_id,
      customerName: payment.customer_name,
      unitId: payment.unit_id,
      unitName: payment.unit_name,
      amount: payment.amount,
      paymentDate: payment.payment_date,
      unitPrice: payment.unit_price,
      remainingAmount: payment.unit_price - payment.amount,
      accountId: payment.account_id,
      transactionId: payment.transaction_id,
    }));
  },

  async getByCustomerId(customerId: string) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('customer_id', customerId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    
    // Transform snake_case to camelCase
    return (data || []).map((payment: any) => ({
      id: payment.id,
      bookingId: payment.booking_id,
      customerId: payment.customer_id,
      customerName: payment.customer_name,
      unitId: payment.unit_id,
      unitName: payment.unit_name,
      amount: payment.amount,
      paymentDate: payment.payment_date,
      unitPrice: payment.unit_price,
      remainingAmount: payment.unit_price - payment.amount,
      accountId: payment.account_id,
      transactionId: payment.transaction_id,
    }));
  },

  async create(payment: Omit<Payment, 'id' | 'remainingAmount'>) {
    const id = `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Transform to snake_case for database
    const dbData = {
      id,
      booking_id: payment.bookingId,
      customer_id: payment.customerId,
      customer_name: payment.customerName,
      unit_id: payment.unitId,
      unit_name: payment.unitName,
      amount: payment.amount,
      payment_date: payment.paymentDate,
      unit_price: payment.unitPrice,
      account_id: payment.accountId,
      transaction_id: payment.transactionId,
    };
    
    const { data, error } = await supabase
      .from('payments')
      .insert([dbData])
      .select();
    if (error) throw error;
    
    // Transform response back to camelCase
    if (data?.[0]) {
      return {
        id: data[0].id,
        bookingId: data[0].booking_id,
        customerId: data[0].customer_id,
        customerName: data[0].customer_name,
        unitId: data[0].unit_id,
        unitName: data[0].unit_name,
        amount: data[0].amount,
        paymentDate: data[0].payment_date,
        unitPrice: data[0].unit_price,
        remainingAmount: data[0].unit_price - data[0].amount,
        accountId: data[0].account_id,
        transactionId: data[0].transaction_id,
      };
    }
  },

  async update(id: string, payment: Partial<Payment>) {
    // Transform to snake_case for database
    const dbData: any = {};
    Object.entries(payment).forEach(([key, value]) => {
      if (key === 'bookingId') dbData.booking_id = value;
      else if (key === 'customerId') dbData.customer_id = value;
      else if (key === 'customerName') dbData.customer_name = value;
      else if (key === 'unitId') dbData.unit_id = value;
      else if (key === 'unitName') dbData.unit_name = value;
      else if (key === 'paymentDate') dbData.payment_date = value;
      else if (key === 'unitPrice') dbData.unit_price = value;
      else if (key === 'accountId') dbData.account_id = value;
      else if (key === 'transactionId') dbData.transaction_id = value;
      else if (key !== 'id' && key !== 'remainingAmount') dbData[key] = value;
    });
    
    const { data, error } = await supabase
      .from('payments')
      .update(dbData)
      .eq('id', id)
      .select();
    if (error) throw error;
    
    // Transform response back to camelCase
    if (data?.[0]) {
      return {
        id: data[0].id,
        bookingId: data[0].booking_id,
        customerId: data[0].customer_id,
        customerName: data[0].customer_name,
        unitId: data[0].unit_id,
        unitName: data[0].unit_name,
        amount: data[0].amount,
        paymentDate: data[0].payment_date,
        unitPrice: data[0].unit_price,
        remainingAmount: data[0].unit_price - data[0].amount,
        accountId: data[0].account_id,
        transactionId: data[0].transaction_id,
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
  async getAll() {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(expense: Omit<Expense, 'id'>) {
    const id = `expense_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...expense, id }])
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
    const id = `transaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, id }])
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
    const id = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    return data || [];
  },

  // Function to get documents for a specific booking
  async getForBooking(bookingId: string) {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('booking_id', bookingId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Function to upload a file and create a document record
  async upload(file: File, linkedTo: { customer_id?: string; booking_id?: string }) {
    if (!linkedTo.customer_id && !linkedTo.booking_id) {
      throw new Error('Document must be linked to a customer or a booking.');
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
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
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
  },

  // Function to get a public URL for a file
  getPublicUrl(filePath: string) {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);
    return data.publicUrl;
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
