/**
 * Units Service - خدمة الوحدات
 * إدارة الوحدات العقارية
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { Unit, UnitType, UnitStatus } from '../../../types';

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

  async update(id: string, unit: Partial<Unit>) {
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

// ==================== Unit Types ====================
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

// ==================== Unit Statuses ====================
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
