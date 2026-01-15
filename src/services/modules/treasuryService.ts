/**
 * Treasury Service - خدمة الخزينة
 * إدارة الحسابات والمعاملات المالية
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { Account, Transaction } from '../../../types';

// ==================== Mapper ====================
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

// ==================== Accounts Service ====================
export const accountsService = {
  /**
   * جلب جميع الحسابات مع إمكانية الفلترة حسب المشروع
   */
  async getAll(filters?: { projectId?: string | null }): Promise<Account[]> {
    let query = supabase
      .from('accounts')
      .select(`
        *,
        projects:project_id (
          id,
          name
        )
      `)
      .order('created_at', { ascending: false });
    
    // فلترة حسب المشروع إذا تم تحديده
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    
    const { data, error } = await query;
    
    if (error && error.code === 'PGRST205') {
      console.warn('Accounts table does not exist, returning empty array');
      return [];
    }
    if (error) throw error;
    
    return (data || []).map(acc => ({
      id: acc.id,
      name: acc.name,
      type: acc.account_type as 'Bank' | 'Cash',
      initialBalance: acc.balance || 0,
      projectId: acc.project_id,
      projectName: acc.projects?.name,
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

  /**
   * إنشاء حساب جديد مرتبط بمشروع
   */
  async create(account: Omit<Account, 'id'>) {
    const id = generateUniqueId('account');
    
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ 
        id,
        name: account.name,
        account_type: account.type,
        balance: account.initialBalance || 0,
        project_id: account.projectId || null,
        description: account.description || null,
        is_active: true,
      }])
      .select(`
        *,
        projects:project_id (
          id,
          name
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
      projectId: data.project_id,
      projectName: data.projects?.name,
      description: data.description,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
    };
  },

  /**
   * تحديث حساب
   */
  async update(id: string, updates: Partial<Account>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.account_type = updates.type;
    if (updates.initialBalance !== undefined) dbUpdates.balance = updates.initialBalance;
    if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
    
    const { data, error } = await supabase
      .from('accounts')
      .update(dbUpdates)
      .eq('id', id)
      .select(`
        *,
        projects:project_id (
          id,
          name
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      type: data.account_type as 'Bank' | 'Cash',
      initialBalance: data.balance || 0,
      projectId: data.project_id,
      projectName: data.projects?.name,
      description: data.description,
      isActive: data.is_active ?? true,
      createdAt: data.created_at,
    };
  },

  /**
   * حذف حساب
   */
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

// ==================== Transactions Service ====================
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
    return (data || []).map(mapTransactionFromDb);
  },

  async create(transaction: Omit<Transaction, 'id'>) {
    const id = generateUniqueId('transaction');
    
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
    
    const { data: fetchedData, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    
    return fetchedData ? mapTransactionFromDb(fetchedData) : undefined;
  },

  async update(id: string, transaction: Partial<Transaction>) {
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
