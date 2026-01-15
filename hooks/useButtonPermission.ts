/**
 * Hook للتحقق من صلاحيات الأزرار
 * يُستخدم في المكونات لإظهار/إخفاء الأزرار حسب صلاحيات المستخدم
 */

import { useAuth } from '../contexts/AuthContext';
import { canShowButton } from '../utils/permissions';

/**
 * Hook للتحقق من صلاحية إظهار زر معين
 * @param pageKey - مفتاح الصفحة (مثل 'customers', 'units', 'bookings')
 * @param buttonKey - مفتاح الزر (مثل 'add', 'edit', 'delete')
 * @returns boolean - true إذا كان الزر مسموح بإظهاره
 */
export function useButtonPermission(pageKey: string, buttonKey: string): boolean {
  const { currentUser } = useAuth();
  
  if (!currentUser) {
    return false;
  }
  
  return canShowButton(
    currentUser.role as 'Admin' | 'Accounting' | 'Sales',
    pageKey,
    buttonKey,
    currentUser.customButtonAccess
  );
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
      console.log(`🔒 canShow(${pageKey}, ${buttonKey}): No current user - DENIED`);
      return false;
    }
    
    const result = canShowButton(
      currentUser.role as 'Admin' | 'Accounting' | 'Sales',
      pageKey,
      buttonKey,
      currentUser.customButtonAccess
    );
    
    // Debug logging - only log when result is false to reduce noise
    if (!result) {
      console.log(`🔒 canShow(${pageKey}, ${buttonKey}):`, {
        role: currentUser.role,
        hasCustomAccess: !!currentUser.customButtonAccess,
        customAccessCount: currentUser.customButtonAccess?.length || 0,
        result
      });
    }
    
    return result;
  };
  
  return { canShow };
}

export default useButtonPermission;
