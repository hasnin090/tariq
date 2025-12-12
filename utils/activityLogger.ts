import { User } from '../types.ts';
import { activityLogService } from '../src/services/supabaseService';
import { devError, devWarn } from './devLogger';

let currentUser: User | null = null;

// استرجاع المستخدم من localStorage
try {
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
} catch (error) {
  devError(error, 'activityLogger: Failed to load current user');
}

/**
 * تسجيل نشاط في قاعدة البيانات
 * تم إزالة localStorage fallback لأسباب أمنية
 */
const logActivity = async (action: string, details: string) => {
    try {
        await activityLogService.log(action, details, currentUser?.id);
    } catch (error) {
        devError(error, 'activityLogger: Failed to log activity');
        devWarn('Activity log failed:', { action, details, userId: currentUser?.id });
    }
};

/**
 * تحديث المستخدم الحالي
 */
export const updateCurrentUser = (user: User | null) => {
  currentUser = user;
};

export default logActivity;
