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
      return false;
    }
    
    return canShowButton(
      currentUser.role as 'Admin' | 'Accounting' | 'Sales',
      pageKey,
      buttonKey,
      currentUser.customButtonAccess
    );
  };
  
  return { canShow };
}

export default useButtonPermission;
