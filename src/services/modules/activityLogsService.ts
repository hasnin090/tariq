/**
 * Activity Logs Service - خدمة سجل النشاطات
 * تتبع جميع العمليات في النظام
 */

import { supabase, generateUniqueId } from '../core/supabaseClient';
import { ActivityLog } from '../../../types';

export const activityLogsService = {
  async getAll(limit: number = 100) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, username)
      `)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    
    return (data || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.users?.name || log.users?.username || 'غير معروف',
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.timestamp,
      interfaceMode: log.interface_mode,
    }));
  },

  async getByUserId(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    
    return (data || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.timestamp,
      interfaceMode: log.interface_mode,
    }));
  },

  async getByEntityType(entityType: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, username)
      `)
      .eq('entity_type', entityType)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    
    return (data || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.users?.name || log.users?.username || 'غير معروف',
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.timestamp,
      interfaceMode: log.interface_mode,
    }));
  },

  async getByEntityId(entityId: string) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select(`
        *,
        users:user_id (name, username)
      `)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    
    return (data || []).map((log: any) => ({
      id: log.id,
      userId: log.user_id,
      userName: log.users?.name || log.users?.username || 'غير معروف',
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      entityName: log.entity_name,
      details: log.details,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.timestamp,
      interfaceMode: log.interface_mode,
    }));
  },

  async create(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const id = generateUniqueId('log');
    const timestamp = new Date().toISOString();
    
    const { error } = await supabase
      .from('activity_logs')
      .insert([{
        id,
        user_id: log.userId,
        action: log.action,
        entity_type: log.entityType,
        entity_id: log.entityId || null,
        entity_name: log.entityName || null,
        details: log.details || null,
        ip_address: log.ipAddress || null,
        user_agent: log.userAgent || null,
        timestamp,
        interface_mode: log.interfaceMode || null,
      }]);
    if (error) {
      console.error('Failed to create activity log:', error);
      // Don't throw - logging should not break the application
    }
    return id;
  },

  async logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    entityName?: string,
    details?: any,
    interfaceMode?: 'projects' | 'expenses'
  ) {
    return this.create({
      userId,
      action,
      entityType,
      entityId,
      entityName,
      details,
      interfaceMode,
    });
  },

  async getStats(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action, entity_type, timestamp')
      .gte('timestamp', startDate.toISOString());
    if (error) throw error;
    
    const actionCounts: Record<string, number> = {};
    const entityCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    
    for (const log of (data || [])) {
      // Count by action
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      // Count by entity type
      entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
      
      // Count by day
      const day = log.timestamp.split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
    
    return {
      totalLogs: (data || []).length,
      byAction: actionCounts,
      byEntityType: entityCounts,
      byDay: dailyCounts,
    };
  },

  async deleteOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const { error } = await supabase
      .from('activity_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());
    if (error) throw error;
  },
};
