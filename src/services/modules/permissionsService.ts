/**
 * Permissions Service - خدمة الصلاحيات
 * إدارة صلاحيات المستخدمين
 */

import { supabase } from '../core/supabaseClient';
import { 
  UserResourcePermission, 
  UserMenuAccess, 
  UserButtonAccess, 
  UserProjectAssignment 
} from '../../../types';

// ==================== User Permissions Service ====================
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
    await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', userId);

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

// ==================== User Menu Access Service ====================
export const userMenuAccessService = {
  async getByUserId(userId: string) {
    const { data, error } = await supabase
      .from('user_menu_access')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    return (data || []).map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      menuKey: m.menu_key,
      isVisible: m.is_visible,
    }));
  },

  async setMenuAccess(userId: string, menuAccess: { menuKey: string; isVisible: boolean }[]) {
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

// ==================== User Button Access Service ====================
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
    await supabase
      .from('user_button_access')
      .delete()
      .eq('user_id', userId);

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

// ==================== User Project Assignments Service ====================
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

// ==================== Full Permissions Service ====================
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
