/**
 * Projects Service - خدمة المشاريع
 * إدارة المشاريع العقارية
 */

import { supabase } from '../core/supabaseClient';
import { Project } from '../../../types';
import { accountsService } from './treasuryService';

export const projectsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    
    return (data || []).map(proj => ({
      ...proj,
      assignedUserId: proj.assigned_user_id,
      salesUserId: proj.sales_user_id,
      accountingUserId: proj.accounting_user_id,
    }));
  },

  async create(project: Omit<Project, 'id'>) {
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
