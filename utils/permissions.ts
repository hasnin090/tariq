/**
 * نظام الصلاحيات المركزي
 * يحدد ما يمكن لكل دور الوصول إليه
 */

export type UserRole = 'Admin' | 'Accounting' | 'Sales';
export type PermissionAction = 'view' | 'edit' | 'delete' | 'create';

export interface Permission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

/**
 * قائمة الصفحات المتاحة لكل دور
 */
export const ROLE_PAGES: Record<UserRole, string[]> = {
  Admin: [
    'dashboard',
    'financial-summary',
    'users',
    'projects-management',
    'project-user-management',
    'customers',
    'units',
    'unit-sales',
    'bookings',
    'bookings-archive',
    'payments',
    'deferred-payments',
    'sales-documents',
    'expenses',
    'expense_dashboard',
    'category-accounting',
    'budgets',
    'projects-accounting',
    'documents-accounting',
    'expense-reports',
    'treasury',
    'vendors',
    'employees',
    'categories',
    'activity-log',
    'financial-dashboard',
    'notifications',
    'reports',
    'general-archive',
    'data-import',
    'customization',
  ],
  Accounting: [
    'dashboard',
    'expenses',
    'expense_dashboard',
    'category-accounting',
    'budgets',
    'projects-accounting',
    'documents-accounting',
    'expense-reports',
    'treasury',
    'vendors',
    'employees',
    'categories',
    'activity-log',
    'financial-dashboard',
    'deferred-payments',
    'notifications',
  ],
  Sales: [
    'dashboard',
    'customers',
    'units',
    'unit-sales',
    'bookings',
    'payments',
    'deferred-payments',
    'sales-documents',
    'notifications',
  ],
};

/**
 * الصلاحيات التفصيلية لكل دور على كل مورد
 */
export const ROLE_PERMISSIONS: Record<UserRole, Record<string, Permission>> = {
  Admin: {
    users: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    projects: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    customers: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    units: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    bookings: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    payments: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    expenses: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    vendors: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    employees: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    categories: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    notifications: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    activityLogs: { canView: true, canEdit: false, canDelete: true, canCreate: false },
    settings: { canView: true, canEdit: true, canDelete: false, canCreate: false },
  },
  Accounting: {
    expenses: { canView: true, canEdit: true, canDelete: true, canCreate: true },
    vendors: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    employees: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    categories: { canView: true, canEdit: false, canDelete: false, canCreate: false },
    treasury: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    budgets: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    deferredPayments: { canView: true, canEdit: true, canDelete: false, canCreate: false },
    notifications: { canView: true, canEdit: false, canDelete: false, canCreate: false },
    activityLogs: { canView: true, canEdit: false, canDelete: false, canCreate: false },
  },
  Sales: {
    customers: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    units: { canView: true, canEdit: true, canDelete: false, canCreate: false },
    bookings: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    payments: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    deferredPayments: { canView: true, canEdit: true, canDelete: false, canCreate: true },
    notifications: { canView: true, canEdit: false, canDelete: false, canCreate: false },
  },
};

/**
 * التحقق من إمكانية الوصول إلى صفحة معينة
 */
export function canAccessPage(role: UserRole, page: string): boolean {
  return ROLE_PAGES[role]?.includes(page) || false;
}

/**
 * الحصول على الصلاحيات لمورد معين
 */
export function getPermissions(role: UserRole, resource: string): Permission {
  return (
    ROLE_PERMISSIONS[role]?.[resource] || {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
    }
  );
}

/**
 * التحقق من صلاحية محددة
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction
): boolean {
  const permissions = getPermissions(role, resource);
  switch (action) {
    case 'view':
      return permissions.canView;
    case 'edit':
      return permissions.canEdit;
    case 'delete':
      return permissions.canDelete;
    case 'create':
      return permissions.canCreate;
    default:
      return false;
  }
}

/**
 * الحصول على الصفحة الافتراضية لكل دور
 */
export function getDefaultPage(role: UserRole): string {
  switch (role) {
    case 'Admin':
      return 'dashboard';
    case 'Accounting':
      return 'expense_dashboard';
    case 'Sales':
      return 'dashboard';
    default:
      return 'dashboard';
  }
}

/**
 * تصفية البيانات حسب المشروع المعين للمستخدم
 */
export function filterByAssignedProject<T extends { projectId?: string }>(
  items: T[],
  userRole: UserRole,
  assignedProjectId: string | null | undefined
): T[] {
  // Admin يرى كل شيء
  if (userRole === 'Admin') {
    return items;
  }

  // المستخدمون الآخرون يرون فقط بيانات مشروعهم
  if (!assignedProjectId) {
    return [];
  }

  return items.filter((item) => item.projectId === assignedProjectId);
}
