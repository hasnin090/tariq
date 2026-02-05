/**
 * Hook للتحقق من صلاحيات الأزرار
 * يُستخدم في المكونات لإظهار/إخفاء الأزرار حسب صلاحيات المستخدم
 */

import { useAuth } from '../contexts/AuthContext';
import { canShowButton } from '../utils/permissions';

// ✅ تفعيل/تعطيل سجلات التصحيح
const DEBUG_PERMISSIONS = false;

/**
 * Hook للتحقق من صلاحية إظهار زر معين
 * @param pageKey - مفتاح الصفحة (مثل 'customers', 'units', 'bookings')
 * @param buttonKey - مفتاح الزر (مثل 'add', 'edit', 'delete')
 * @returns boolean - true إذا كان الزر مسموح بإظهاره
 */
export function useButtonPermission(pageKey: string, buttonKey: string): boolean {
  const { currentUser } = useAuth();
  
  // ✅ لا مستخدم = لا صلاحيات
  if (!currentUser) {
    if (DEBUG_PERMISSIONS) {
      console.log(`🔒 useButtonPermission(${pageKey}, ${buttonKey}): No user - DENIED`);
    }
    return false;
  }
  
  const result = canShowButton(
    currentUser.role as 'Admin' | 'Accounting' | 'Sales',
    pageKey,
    buttonKey,
    currentUser.customButtonAccess
  );
  
  // ✅ تسجيل شامل للتصحيح - مهم جداً لفهم سلوك الصلاحيات
  if (DEBUG_PERMISSIONS) {
    console.log(`🔐 useButtonPermission(${pageKey}, ${buttonKey}):`, {
      user: currentUser.username,
      role: currentUser.role,
      hasCustomButtonAccess: currentUser.customButtonAccess !== undefined && currentUser.customButtonAccess !== null,
      customButtonAccessCount: currentUser.customButtonAccess?.length || 0,
      result: result ? '✅ ALLOWED' : '❌ DENIED'
    });
  }
  
  return result;
}

/**
 * Hook للحصول على دالة التحقق من صلاحيات الأزرار
 * مفيد عند الحاجة للتحقق من عدة أزرار
 * @returns دالة للتحقق من صلاحية زر معين
 */
export function useButtonPermissions() {
  const { currentUser } = useAuth();
  
  const canShow = (pageKey: string, buttonKey: string): boolean => {
    if (!currentUser) {
      if (DEBUG_PERMISSIONS) {
        console.log(`🔒 canShow(${pageKey}, ${buttonKey}): No current user - DENIED`);
      }
      return false;
    }
    
    const result = canShowButton(
      currentUser.role as 'Admin' | 'Accounting' | 'Sales',
      pageKey,
      buttonKey,
      currentUser.customButtonAccess
    );
    
    // ✅ تسجيل شامل للتصحيح
    if (DEBUG_PERMISSIONS) {
      console.log(`🔐 canShow(${pageKey}, ${buttonKey}):`, {
        user: currentUser.username,
        role: currentUser.role,
        hasCustomAccess: currentUser.customButtonAccess !== undefined && currentUser.customButtonAccess !== null,
        customAccessCount: currentUser.customButtonAccess?.length || 0,
        result: result ? '✅ ALLOWED' : '❌ DENIED'
      });
    }
    
    return result;
  };
  
  return { canShow };
}

export default useButtonPermission;
