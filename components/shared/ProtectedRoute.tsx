import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission, UserRole, PermissionAction } from '../../utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  resource?: string;
  action?: PermissionAction;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  resource,
  action = 'view',
  allowedRoles,
}) => {
  const { currentUser } = useAuth();

  // التحقق من تسجيل الدخول
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center backdrop-blur-xl bg-white/10 dark:bg-white/5 p-12 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl max-w-md">
          <svg className="w-20 h-20 text-yellow-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            🔐 يجب تسجيل الدخول
          </h2>
          <p className="text-slate-600 dark:text-slate-300">الرجاء تسجيل الدخول للمتابعة</p>
        </div>
      </div>
    );
  }

  // التحقق من الدور المسموح
  if (allowedRoles && !allowedRoles.includes(currentUser.role as UserRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center backdrop-blur-xl bg-white/10 dark:bg-white/5 p-12 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl max-w-md">
          <svg className="w-20 h-20 text-red-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            ⛔ غير مصرح بالوصول
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            دورك الحالي: <span className="font-bold text-primary-600 dark:text-primary-400">{currentUser.role}</span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            الأدوار المسموحة: <span className="font-semibold">{allowedRoles.join('، ')}</span>
          </p>
        </div>
      </div>
    );
  }

  // التحقق من الصلاحية على مورد محدد
  if (resource && action && !hasPermission(currentUser.role as UserRole, resource, action as PermissionAction)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center backdrop-blur-xl bg-white/10 dark:bg-white/5 p-12 rounded-2xl border border-white/20 dark:border-white/10 shadow-2xl max-w-md">
          <svg className="w-20 h-20 text-red-400 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            ⛔ صلاحيات غير كافية
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            ليس لديك صلاحية <span className="font-bold text-rose-600 dark:text-rose-400">{action === 'view' ? 'العرض' : action === 'edit' ? 'التعديل' : action === 'delete' ? 'الحذف' : 'الإضافة'}</span>
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            على <span className="font-semibold">{resource}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
