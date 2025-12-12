/**
 * نظام الصلاحيات المركزي
 * يحدد ما يمكن لكل دور الوصول إليه
 * مع دعم الصلاحيات المخصصة من قاعدة البيانات
 */

import { UserResourcePermission, UserMenuAccess, UserButtonAccess, UserProjectAssignment, MenuDefinition, ButtonDefinition } from '../types';

export type UserRole = 'Admin' | 'Accounting' | 'Sales';
export type PermissionAction = 'view' | 'edit' | 'delete' | 'create';

export interface Permission {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

// ============================================================================
// قائمة الموارد المتاحة في النظام
// ============================================================================
export const SYSTEM_RESOURCES = [
  { key: 'users', label: 'المستخدمين', interface: 'both' },
  { key: 'projects', label: 'المشاريع', interface: 'both' },
  { key: 'customers', label: 'العملاء', interface: 'projects' },
  { key: 'units', label: 'الوحدات', interface: 'projects' },
  { key: 'bookings', label: 'الحجوزات', interface: 'projects' },
  { key: 'payments', label: 'المدفوعات', interface: 'projects' },
  { key: 'sales', label: 'المبيعات', interface: 'projects' },
  { key: 'expenses', label: 'المصروفات', interface: 'expenses' },
  { key: 'vendors', label: 'الموردين', interface: 'expenses' },
  { key: 'employees', label: 'الموظفين', interface: 'expenses' },
  { key: 'categories', label: 'التصنيفات', interface: 'expenses' },
  { key: 'treasury', label: 'الخزينة', interface: 'expenses' },
  { key: 'budgets', label: 'الميزانيات', interface: 'expenses' },
  { key: 'documents', label: 'المستندات', interface: 'both' },
  { key: 'reports', label: 'التقارير', interface: 'both' },
  { key: 'notifications', label: 'الإشعارات', interface: 'both' },
] as const;

// ============================================================================
// قائمة القوائم المتاحة في النظام - منظمة حسب الواجهة
// ============================================================================

// قوائم واجهة المبيعات
export const SALES_MENUS: MenuDefinition[] = [
  { key: 'dashboard', label: 'لوحة التحكم', interface: 'projects' },
  { key: 'financial-summary', label: 'الملخص المالي', interface: 'projects' },
  { key: 'customers', label: 'العملاء', interface: 'projects' },
  { key: 'units', label: 'الوحدات', interface: 'projects' },
  { key: 'sales', label: 'المبيعات', interface: 'projects' },
  { key: 'bookings', label: 'الحجوزات', interface: 'projects' },
  { key: 'bookings-archive', label: 'أرشيف الحجوزات', interface: 'projects' },
  { key: 'payments', label: 'المدفوعات', interface: 'projects' },
  { key: 'sales-documents', label: 'مستندات المبيعات', interface: 'projects' },
  { key: 'reports', label: 'التقارير', interface: 'projects' },
  { key: 'general-archive', label: 'الأرشيف العام', interface: 'projects' },
  { key: 'data-import', label: 'استيراد البيانات', interface: 'projects' },
];

// قوائم واجهة المحاسبة
export const ACCOUNTING_MENUS: MenuDefinition[] = [
  { key: 'financial-dashboard', label: 'لوحة المحاسبة', interface: 'expenses' },
  { key: 'expense_dashboard', label: 'لوحة المصروفات', interface: 'expenses' },
  { key: 'expenses', label: 'المصروفات', interface: 'expenses' },
  { key: 'treasury', label: 'الخزينة', interface: 'expenses' },
  { key: 'vendors', label: 'الموردين', interface: 'expenses' },
  { key: 'employees', label: 'الموظفين', interface: 'expenses' },
  { key: 'categories', label: 'التصنيفات', interface: 'expenses' },
  { key: 'budgets', label: 'الميزانيات', interface: 'expenses' },
  { key: 'projects-accounting', label: 'مشاريع المحاسبة', interface: 'expenses' },
  { key: 'category-accounting', label: 'تصنيفات المحاسبة', interface: 'expenses' },
  { key: 'documents-accounting', label: 'مستندات المحاسبة', interface: 'expenses' },
  { key: 'expense-reports', label: 'تقارير المصروفات', interface: 'expenses' },
  { key: 'activity-log', label: 'سجل النشاط', interface: 'expenses' },
];

// قوائم مشتركة بين الواجهتين
export const SHARED_MENUS: MenuDefinition[] = [
  { key: 'deferred-payments', label: 'الدفعات المؤجلة', interface: 'both' },
  { key: 'notifications', label: 'الإشعارات', interface: 'both' },
];

// قوائم إدارة النظام (للمدير فقط)
export const ADMIN_MENUS: MenuDefinition[] = [
  { key: 'users', label: 'إدارة المستخدمين', interface: 'both' },
  { key: 'projects-management', label: 'إدارة المشاريع', interface: 'both' },
  { key: 'project-user-management', label: 'ربط المشاريع والمستخدمين', interface: 'both' },
  { key: 'user-permissions-manager', label: 'إدارة الصلاحيات المتقدمة', interface: 'both' },
  { key: 'customization', label: 'التخصيص', interface: 'both' },
];

// قوائم التخصيص الفرعية
export const CUSTOMIZATION_MENUS: MenuDefinition[] = [
  { key: 'unit-types', label: 'أنواع الوحدات', interface: 'both' },
  { key: 'unit-statuses', label: 'حالات الوحدات', interface: 'both' },
  { key: 'expense-categories', label: 'فئات المصروفات', interface: 'both' },
  { key: 'system-settings', label: 'إعدادات النظام', interface: 'both' },
];

// جميع القوائم مجمعة للتوافق مع الكود القديم
export const SYSTEM_MENUS: MenuDefinition[] = [
  ...SALES_MENUS,
  ...ACCOUNTING_MENUS,
  ...SHARED_MENUS,
  ...ADMIN_MENUS,
  ...CUSTOMIZATION_MENUS,
];

// ============================================================================
// قائمة الأزرار المتاحة في كل صفحة - منظمة حسب الواجهة
// ============================================================================

// أزرار عامة تظهر في جميع الصفحات
export const GENERAL_BUTTONS: ButtonDefinition[] = [
  { key: 'add', label: 'إضافة', page: '*', interface: 'both' },
  { key: 'edit', label: 'تعديل', page: '*', interface: 'both' },
  { key: 'delete', label: 'حذف', page: '*', interface: 'both' },
  { key: 'export', label: 'تصدير', page: '*', interface: 'both' },
  { key: 'print', label: 'طباعة', page: '*', interface: 'both' },
  { key: 'search', label: 'بحث', page: '*', interface: 'both' },
  { key: 'filter', label: 'فلترة', page: '*', interface: 'both' },
];

// أزرار واجهة المبيعات
export const SALES_BUTTONS: ButtonDefinition[] = [
  // أزرار خاصة بالعملاء
  { key: 'add-document', label: 'إضافة مستند', page: 'customers', interface: 'projects' },
  { key: 'view-history', label: 'عرض السجل', page: 'customers', interface: 'projects' },
  
  // أزرار خاصة بالوحدات
  { key: 'book-unit', label: 'حجز الوحدة', page: 'units', interface: 'projects' },
  { key: 'sell-unit', label: 'بيع الوحدة', page: 'units', interface: 'projects' },
  { key: 'change-status', label: 'تغيير الحالة', page: 'units', interface: 'projects' },
  
  // أزرار خاصة بالحجوزات
  { key: 'add-payment', label: 'إضافة دفعة', page: 'bookings', interface: 'projects' },
  { key: 'cancel-booking', label: 'إلغاء الحجز', page: 'bookings', interface: 'projects' },
  { key: 'complete-booking', label: 'إكمال البيع', page: 'bookings', interface: 'projects' },
  { key: 'view-payments', label: 'عرض الدفعات', page: 'bookings', interface: 'projects' },
  
  // أزرار خاصة بالمدفوعات
  { key: 'edit-payment', label: 'تعديل الدفعة', page: 'payments', interface: 'projects' },
  { key: 'delete-payment', label: 'حذف الدفعة', page: 'payments', interface: 'projects' },
  { key: 'print-receipt', label: 'طباعة الإيصال', page: 'payments', interface: 'projects' },
  
  // أزرار خاصة بالمبيعات
  { key: 'view-sale-details', label: 'عرض تفاصيل البيع', page: 'sales', interface: 'projects' },
  { key: 'add-sale-document', label: 'إضافة مستند للبيع', page: 'sales', interface: 'projects' },
];

// أزرار واجهة المحاسبة
export const ACCOUNTING_BUTTONS: ButtonDefinition[] = [
  // أزرار خاصة بالمصروفات
  { key: 'add-expense', label: 'إضافة مصروف', page: 'expenses', interface: 'expenses' },
  { key: 'edit-expense', label: 'تعديل مصروف', page: 'expenses', interface: 'expenses' },
  { key: 'delete-expense', label: 'حذف مصروف', page: 'expenses', interface: 'expenses' },
  { key: 'attach-document', label: 'إرفاق مستند', page: 'expenses', interface: 'expenses' },
  
  // أزرار خاصة بالخزينة
  { key: 'deposit', label: 'إيداع', page: 'treasury', interface: 'expenses' },
  { key: 'withdraw', label: 'سحب', page: 'treasury', interface: 'expenses' },
  { key: 'transfer', label: 'تحويل', page: 'treasury', interface: 'expenses' },
  { key: 'view-transactions', label: 'عرض الحركات', page: 'treasury', interface: 'expenses' },
  
  // أزرار خاصة بالموردين
  { key: 'add-vendor', label: 'إضافة مورد', page: 'vendors', interface: 'expenses' },
  { key: 'edit-vendor', label: 'تعديل مورد', page: 'vendors', interface: 'expenses' },
  { key: 'view-vendor-transactions', label: 'عرض معاملات المورد', page: 'vendors', interface: 'expenses' },
  
  // أزرار خاصة بالموظفين
  { key: 'add-employee', label: 'إضافة موظف', page: 'employees', interface: 'expenses' },
  { key: 'edit-employee', label: 'تعديل موظف', page: 'employees', interface: 'expenses' },
  { key: 'pay-salary', label: 'دفع راتب', page: 'employees', interface: 'expenses' },
  
  // أزرار خاصة بالميزانيات
  { key: 'add-budget', label: 'إضافة ميزانية', page: 'budgets', interface: 'expenses' },
  { key: 'edit-budget', label: 'تعديل ميزانية', page: 'budgets', interface: 'expenses' },
  { key: 'view-budget-report', label: 'عرض تقرير الميزانية', page: 'budgets', interface: 'expenses' },
  
  // أزرار خاصة بالمستندات
  { key: 'upload-document', label: 'رفع مستند', page: 'documents-accounting', interface: 'expenses' },
  { key: 'link-document', label: 'ربط مستند بحركة', page: 'documents-accounting', interface: 'expenses' },
  { key: 'unlink-document', label: 'إلغاء ربط المستند', page: 'documents-accounting', interface: 'expenses' },
  { key: 'delete-document', label: 'حذف مستند', page: 'documents-accounting', interface: 'expenses' },
];

// جميع الأزرار مجمعة للتوافق مع الكود القديم
export const SYSTEM_BUTTONS: ButtonDefinition[] = [
  ...GENERAL_BUTTONS,
  ...SALES_BUTTONS,
  ...ACCOUNTING_BUTTONS,
];

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
    'user-permissions-manager',
    'customers',
    'units',
    'sales',
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
    // أقسام التخصيص الفرعية
    'unit-types',
    'unit-statuses',
    'expense-categories',
    'system-settings',
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
    'sales',
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
 * يدعم الصلاحيات المخصصة من قاعدة البيانات
 */
export function canAccessPage(
  role: UserRole, 
  page: string, 
  customMenuAccess?: UserMenuAccess[]
): boolean {
  // إذا كان المستخدم Admin، يمكنه الوصول لكل شيء
  if (role === 'Admin') {
    return true;
  }
  
  // إذا توجد صلاحيات مخصصة، استخدمها
  if (customMenuAccess && customMenuAccess.length > 0) {
    const menuItem = customMenuAccess.find(m => m.menuKey === page);
    if (menuItem) {
      return menuItem.isVisible;
    }
    // إذا لم يوجد تخصيص لهذه القائمة، لا يمكن الوصول
    return false;
  }
  
  // الرجوع للصلاحيات الافتراضية حسب الدور
  return ROLE_PAGES[role]?.includes(page) || false;
}

/**
 * الحصول على الصلاحيات لمورد معين
 * يدعم الصلاحيات المخصصة من قاعدة البيانات
 */
export function getPermissions(
  role: UserRole, 
  resource: string,
  customPermissions?: UserResourcePermission[]
): Permission {
  // إذا كان المستخدم Admin، له كل الصلاحيات
  if (role === 'Admin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreate: true,
    };
  }
  
  // إذا توجد صلاحيات مخصصة، استخدمها
  if (customPermissions && customPermissions.length > 0) {
    const perm = customPermissions.find(p => p.resource === resource);
    if (perm) {
      return {
        canView: perm.canView,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
        canCreate: perm.canCreate,
      };
    }
    // إذا لم يوجد تخصيص لهذا المورد، لا صلاحيات
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
    };
  }
  
  // الرجوع للصلاحيات الافتراضية حسب الدور
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
 * يدعم الصلاحيات المخصصة
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: PermissionAction,
  customPermissions?: UserResourcePermission[]
): boolean {
  const permissions = getPermissions(role, resource, customPermissions);
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
 * التحقق من ظهور زر معين
 */
export function canShowButton(
  role: UserRole,
  pageKey: string,
  buttonKey: string,
  customButtonAccess?: UserButtonAccess[]
): boolean {
  // Admin يرى كل الأزرار
  if (role === 'Admin') {
    return true;
  }
  
  // إذا توجد صلاحيات مخصصة للأزرار
  if (customButtonAccess && customButtonAccess.length > 0) {
    // ابحث عن الزر المحدد أو الزر العام (*)
    const buttonAccess = customButtonAccess.find(
      b => (b.pageKey === pageKey || b.pageKey === '*') && b.buttonKey === buttonKey
    );
    if (buttonAccess) {
      return buttonAccess.isVisible;
    }
    // إذا لم يوجد تخصيص، افتراضياً مخفي
    return false;
  }
  
  // الافتراضي: كل الأزرار ظاهرة
  return true;
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
 * يدعم التعيينات المتعددة للمشاريع
 */
export function filterByAssignedProject<T extends { projectId?: string }>(
  items: T[],
  userRole: UserRole,
  assignedProjectId: string | null | undefined,
  projectAssignments?: UserProjectAssignment[]
): T[] {
  // Admin يرى كل شيء
  if (userRole === 'Admin') {
    return items;
  }

  // إذا توجد تعيينات متعددة للمشاريع
  if (projectAssignments && projectAssignments.length > 0) {
    const assignedProjectIds = projectAssignments.map(a => a.projectId);
    return items.filter((item) => item.projectId && assignedProjectIds.includes(item.projectId));
  }

  // الرجوع للتعيين الفردي القديم
  if (!assignedProjectId) {
    return [];
  }

  return items.filter((item) => item.projectId === assignedProjectId);
}

/**
 * الحصول على قائمة المشاريع المتاحة للمستخدم
 */
export function getAssignedProjectIds(
  userRole: UserRole,
  projectAssignments?: UserProjectAssignment[],
  interfaceMode?: 'projects' | 'expenses'
): string[] {
  // Admin يرى كل المشاريع
  if (userRole === 'Admin') {
    return []; // فارغة تعني "كل المشاريع"
  }
  
  if (!projectAssignments || projectAssignments.length === 0) {
    return [];
  }
  
  // فلترة حسب نوع الواجهة إذا تم تحديدها
  if (interfaceMode) {
    return projectAssignments
      .filter(a => a.interfaceMode === interfaceMode)
      .map(a => a.projectId);
  }
  
  return projectAssignments.map(a => a.projectId);
}

/**
 * الحصول على القوائم الافتراضية للمستخدم الجديد حسب دوره
 */
export function getDefaultMenusForRole(role: UserRole): string[] {
  return ROLE_PAGES[role] || [];
}

/**
 * الحصول على الصلاحيات الافتراضية للمستخدم الجديد حسب دوره
 */
export function getDefaultPermissionsForRole(role: UserRole): Record<string, Permission> {
  return ROLE_PERMISSIONS[role] || {};
}
