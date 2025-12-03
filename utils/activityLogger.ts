import { User } from '../types.ts';
import { activityLogService } from '../src/services/supabaseService';

let currentUser: User | null = null;

// استرجاع المستخدم من localStorage
try {
  const storedUser = localStorage.getItem('auth_user');
  if (storedUser) {
    currentUser = JSON.parse(storedUser);
  }
} catch (error) {
  console.error('Failed to load current user:', error);
}

/**
 * تسجيل نشاط في قاعدة البيانات
 * تم إزالة localStorage fallback لأسباب أمنية
 */
const logActivity = async (action: string, details: string) => {
    try {
        await activityLogService.log(action, details, currentUser?.id);
    } catch (error) {
        console.error('❌ Failed to log activity:', error);
        // لا نحفظ في localStorage لأسباب أمنية
        // بدلاً من ذلك، نرسل تنبيه للمطورين
        if (process.env.NODE_ENV === 'development') {
            console.warn('Activity log failed:', { action, details, userId: currentUser?.id });
        }
    }
};

/**
 * تحديث المستخدم الحالي
 */
export const updateCurrentUser = (user: User | null) => {
  currentUser = user;
};

export default logActivity;
