/**
 * Expenses Service - خدمة المصروفات
 * إدارة المصروفات والتصنيفات
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { 
  validateDate, 
  validateAmount, 
  validateText,
  sanitizeText,
  ValidationError 
} from '../core/validation';
import { Expense, ExpenseCategory, Vendor } from '../../../types';

export const expensesService = {
  async getAll(): Promise<Expense[]> {
    let allData: any[] = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;

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
    const dateValidation = validateDate(expense.date);
    if (!dateValidation.valid) throw new ValidationError(dateValidation.error!);
    
    const amountValidation = validateAmount(expense.amount);
    if (!amountValidation.valid) throw new ValidationError(amountValidation.error!);
    
    if (expense.description) {
      const descriptionValidation = validateText(expense.description, 500);
      if (!descriptionValidation.valid) throw new ValidationError(descriptionValidation.error!);
    }
    
    const id = generateUniqueId('expense');
    
    const dbExpense = {
      id,
      expense_date: expense.date,
      description: expense.description ? sanitizeText(expense.description) : null,
      amount: expense.amount,
      category_id: expense.categoryId || null,
      project_id: expense.projectId || null,
      account_id: expense.accountId || null,
      vendor_id: expense.vendorId || null,
      transaction_id: expense.transactionId || null,
      deferred_payment_installment_id: expense.deferredPaymentInstallmentId || null,
      employee_id: expense.employeeId || null,
    };
    
    const { error } = await supabase
      .from('expenses')
      .insert(dbExpense);
    
    if (error) throw error;
    
    const { data: fetchedData, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
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

// ==================== Expense Categories ====================
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
    let query = supabase
      .from('expense_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    } else {
      query = query.is('project_id', null);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((cat: any) => ({
      id: cat.id,
      name: cat.name,
      description: cat.description,
      projectId: cat.project_id
    }));
  },

  async findByName(name: string, projectId: string | null) {
    let query = supabase
      .from('expense_categories')
      .select('*')
      .eq('name', name.trim());
    
    if (projectId) {
      query = query.or(`project_id.eq.${projectId},project_id.is.null`);
    } else {
      query = query.is('project_id', null);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (data && data.length > 0) {
      const cat = data[0];
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        projectId: cat.project_id
      };
    }
    return null;
  },

  async findOrCreate(name: string, projectId: string | null) {
    const existing = await this.findByName(name, projectId);
    if (existing) return existing;
    
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

// ==================== Vendors ====================
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
