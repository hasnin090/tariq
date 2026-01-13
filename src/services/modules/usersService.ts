/**
 * Users Service - خدمة المستخدمين
 * إدارة المستخدمين والصلاحيات
 */

import { supabase, generateUUID } from '../core/supabaseClient';
import { 
  validateEmail, 
  validateUsername, 
  validateName, 
  validatePassword,
  sanitizeText,
  ValidationError 
} from '../core/validation';
import { hashPassword } from '../../../utils/passwordUtils';
import { User } from '../../../types';

// إضافة صلاحيات افتراضية بناءً على الدور
const addPermissionsToUser = (user: any) => {
  if (!user) return user;
  
  if (user.permissions) return user;
  
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
    const nameValidation = validateName(user.name);
    if (!nameValidation.valid) throw new ValidationError(nameValidation.error!);
    
    const usernameValidation = validateUsername(user.username);
    if (!usernameValidation.valid) throw new ValidationError(usernameValidation.error!);
    
    if (user.email) {
      const emailValidation = validateEmail(user.email);
      if (!emailValidation.valid) throw new ValidationError(emailValidation.error!);
    }
    
    const id = generateUUID();
    const { password, projectAssignments, permissions, ...userWithoutPassword } = user as any;
    
    if (!password) {
      throw new ValidationError('كلمة المرور مطلوبة عند إنشاء مستخدم جديد');
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ValidationError(passwordValidation.error!);
    }
    
    const hashedPassword = await hashPassword(password);
    
    const cleanUserData = {
      name: sanitizeText(userWithoutPassword.name),
      username: sanitizeText(userWithoutPassword.username),
      email: userWithoutPassword.email ? sanitizeText(userWithoutPassword.email) : null,
      role: userWithoutPassword.role,
      password: hashedPassword
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...cleanUserData, id }])
      .select('id, name, username, email, role')
      .single();
    
    if (error) {
      if (error.code === '23505' && error.message.includes('users_username_key')) {
        throw new Error('اسم المستخدم مستخدم بالفعل. الرجاء اختيار اسم مختلف.');
      }
      throw error;
    }
    
    return {
      ...data,
      permissions: permissions || { canView: true, canEdit: false, canDelete: false }
    };
  },

  async update(id: string, user: Partial<User>) {
    const { password, permissions, projectAssignments, ...userWithoutPassword } = user as any;
    
    const updateData: any = { ...userWithoutPassword };
    if (password && password.trim()) {
      updateData.password = await hashPassword(password);
    }
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, username, email, role')
      .single();
    
    if (error) throw error;
    
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

  async createPasswordResetNotification(username: string) {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, name')
      .eq('username', username)
      .single();
    
    if (userError || !users) {
      throw new Error('اسم المستخدم غير موجود');
    }

    const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
};
