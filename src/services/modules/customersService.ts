/**
 * Customers Service - خدمة العملاء
 * إدارة بيانات العملاء
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { 
  validateName, 
  validatePhone, 
  validateEmail,
  sanitizeText,
  ValidationError 
} from '../core/validation';
import { Customer } from '../../../types';

export const customersService = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map(customer => ({
      ...customer,
      projectId: customer.project_id,
    }));
  },

  async create(customer: Omit<Customer, 'id'>) {
    const nameValidation = validateName(customer.name);
    if (!nameValidation.valid) throw new ValidationError(nameValidation.error!);
    
    const phoneValidation = validatePhone(customer.phone);
    if (!phoneValidation.valid) throw new ValidationError(phoneValidation.error!);
    
    if (customer.email) {
      const emailValidation = validateEmail(customer.email);
      if (!emailValidation.valid) throw new ValidationError(emailValidation.error!);
    }
    
    const id = generateUniqueId('customer');
    
    const dbCustomer: any = {
      ...customer,
      id,
      name: sanitizeText(customer.name),
      phone: sanitizeText(customer.phone),
      email: customer.email ? sanitizeText(customer.email) : null,
      project_id: customer.projectId || null,
    };
    
    delete dbCustomer.projectId;
    
    const { data, error } = await supabase
      .from('customers')
      .insert([dbCustomer])
      .select();
    if (error) throw error;
    
    const result = data?.[0];
    return result ? {
      ...result,
      projectId: result.project_id,
    } : result;
  },

  async update(id: string, customer: Partial<Customer>) {
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
