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
  { key: 'scheduled-payments', label: 'جدول الدفعات', interface: 'projects' },
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
  
  // أزرار خاصة بالتقارير المالية
  { key: 'export_reports', label: 'تصدير التقارير', page: 'financial-reports', interface: 'expenses' },
  { key: 'view_detailed_reports', label: 'عرض التقارير التفصيلية', page: 'financial-reports', interface: 'expenses' },
  
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
    'scheduled-payments',
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
 * التحقق مما إذا كان المستخدم لديه صلاحيات قوائم مخصصة
 * ⚠️ يُرجع true حتى لو كان الarray فارغاً (يعني تم تعيين صلاحيات مخصصة لكن لم يُمنح أي شيء)
 * يُرجع false فقط إذا كان undefined أو null (لم يتم تعيين صلاحيات مخصصة أصلاً)
 */
export function hasCustomMenuAccess(customMenuAccess?: UserMenuAccess[]): boolean {
  return customMenuAccess !== undefined && customMenuAccess !== null;
}

/**
 * التحقق من إمكانية الوصول إلى صفحة معينة
 * يدعم الصلاحيات المخصصة من قاعدة البيانات
 * 
 * قواعد الصلاحيات:
 * - Admin: يمكنه الوصول لكل شيء
 * - المستخدم مع صلاحيات مخصصة: يرى فقط القوائم المحددة له صراحةً (isVisible = true)
 * - المستخدم بدون صلاحيات مخصصة: يستخدم صلاحيات دوره الافتراضية
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
  
  // إذا توجد صلاحيات مخصصة (حتى لو فارغة)، استخدمها بشكل حصري
  if (hasCustomMenuAccess(customMenuAccess)) {
    const menuItem = customMenuAccess!.find(m => m.menuKey === page);
    const result = menuItem ? menuItem.isVisible : false;
    // يظهر فقط إذا كان موجود و isVisible = true
    return result;
  }
  
  // ✅ بدون صلاحيات مخصصة: استخدم صلاحيات الدور الافتراضية
  const rolePages = ROLE_PAGES[role] || [];
  const result = rolePages.includes(page);
  return result;
}

/**
 * التحقق مما إذا كان المستخدم لديه صلاحيات موارد مخصصة
 * ⚠️ يُرجع true حتى لو كان الarray فارغاً
 * يُرجع false فقط إذا كان undefined أو null
 */
export function hasCustomResourcePermissions(customPermissions?: UserResourcePermission[]): boolean {
  return customPermissions !== undefined && customPermissions !== null;
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
  // إذا كان المستخدم Admin، له كل الصلاحيات دائماً
  if (role === 'Admin') {
    return {
      canView: true,
      canEdit: true,
      canDelete: true,
      canCreate: true,
    };
  }
  
  // إذا توجد صلاحيات مخصصة، استخدمها بشكل حصري
  if (hasCustomResourcePermissions(customPermissions)) {
    const perm = customPermissions!.find(p => p.resource === resource);
    if (perm) {
      return {
        canView: perm.canView,
        canEdit: perm.canEdit,
        canDelete: perm.canDelete,
        canCreate: perm.canCreate,
      };
    }
    // إذا لم يوجد تخصيص لهذا المورد، لا صلاحيات
    // هذا السلوك المتوقع: الصلاحيات المخصصة تلغي الصلاحيات الافتراضية
    return {
      canView: false,
      canEdit: false,
      canDelete: false,
      canCreate: false,
    };
  }
  
  // الرجوع للصلاحيات الافتراضية حسب الدور فقط إذا لم توجد صلاحيات مخصصة
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
 * التحقق مما إذا كان المستخدم لديه صلاحيات أزرار مخصصة
 * ⚠️ يُرجع true حتى لو كان الarray فارغاً
 * يُرجع false فقط إذا كان undefined أو null
 */
export function hasCustomButtonAccess(customButtonAccess?: UserButtonAccess[]): boolean {
  return customButtonAccess !== undefined && customButtonAccess !== null;
}

// ✅ تفعيل/تعطيل سجلات التصحيح للصلاحيات
const DEBUG_BUTTON_PERMISSIONS = false;

/**
 * التحقق من ظهور زر معين
 * 
 * قواعد الصلاحيات:
 * - Admin: يرى كل الأزرار
 * - المستخدم مع صلاحيات مخصصة: حسب التخصيص - الزر يجب أن يكون موجود بـ isVisible=true
 * - المستخدم بدون صلاحيات مخصصة: عرض وتصدير فقط (بدون إضافة/تعديل/حذف)
 */
export function canShowButton(
  role: UserRole,
  pageKey: string,
  buttonKey: string,
  customButtonAccess?: UserButtonAccess[]
): boolean {
  // ✅ حماية من القيم الفارغة أو غير المعرّفة
  if (!pageKey || !buttonKey) {
    console.warn('⚠️ canShowButton called with invalid params:', { pageKey, buttonKey });
    return false;
  }
  
  // Admin يرى كل الأزرار دائماً
  if (role === 'Admin') {
    if (DEBUG_BUTTON_PERMISSIONS) {
    }
    return true;
  }
  
  // إذا توجد صلاحيات مخصصة للأزرار، استخدمها بشكل حصري
  if (hasCustomButtonAccess(customButtonAccess)) {
    const isDeleteLike = (key: string) =>
      key === 'delete' ||
      key.startsWith('delete-') ||
      key.startsWith('delete_') ||
      key.endsWith('-delete') ||
      key.endsWith('_delete');

    // ✅ قواعد خاصة لأزرار الحذف: منع الحذف العام يتغلب على أي صلاحيات حذف فرعية
    if (isDeleteLike(buttonKey)) {
      // تحقق من صلاحية الحذف العامة (*)
      const globalDelete = customButtonAccess!.find(
        b => b.pageKey === '*' && b.buttonKey === 'delete'
      );
      if (globalDelete && !globalDelete.isVisible) {
        if (DEBUG_BUTTON_PERMISSIONS) {
        }
        return false;
      }

      // تحقق من صلاحية الحذف الخاصة بالصفحة
      const pageDelete = customButtonAccess!.find(
        b => b.pageKey === pageKey && b.buttonKey === 'delete'
      );
      if (pageDelete && !pageDelete.isVisible) {
        if (DEBUG_BUTTON_PERMISSIONS) {
        }
        return false;
      }
    }

    // ابحث عن الزر المحدد (أولوية للصفحة المحددة، ثم العام)
    const specificButton = customButtonAccess!.find(
      b => b.pageKey === pageKey && b.buttonKey === buttonKey
    );
    if (specificButton) {
      if (DEBUG_BUTTON_PERMISSIONS) {
      }
      return specificButton.isVisible;
    }

    const globalButton = customButtonAccess!.find(
      b => b.pageKey === '*' && b.buttonKey === buttonKey
    );
    if (globalButton) {
      if (DEBUG_BUTTON_PERMISSIONS) {
      }
      return globalButton.isVisible;
    }

    // ✅ fallback: مفاتيح مثل delete-expense تُعامل كـ delete
    if (buttonKey.startsWith('delete-') || buttonKey.startsWith('delete_')) {
      const genericDelete = customButtonAccess!.find(
        b => (b.pageKey === pageKey || b.pageKey === '*') && b.buttonKey === 'delete'
      );
      if (genericDelete) {
        if (DEBUG_BUTTON_PERMISSIONS) {
        }
        return genericDelete.isVisible;
      }
    }

    // ✅ إذا لم يوجد تخصيص لهذا الزر في الصلاحيات المخصصة = مرفوض
    if (DEBUG_BUTTON_PERMISSIONS) {
    }
    return false;
  }
  
  // ✅ بدون صلاحيات مخصصة: صلاحيات محدودة جداً
  // فقط عرض وتصدير وطباعة - بدون إضافة أو تعديل أو حذف
  const safeButtons = ['view', 'export', 'print', 'search', 'filter'];
  const result = safeButtons.includes(buttonKey);
  
  if (DEBUG_BUTTON_PERMISSIONS) {
  }
  
  return result;
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

// ============================================================================
// نظام قوالب الصلاحيات - لتبسيط إدارة الصلاحيات
// ============================================================================

export type PermissionTemplate = 'full' | 'view-only' | 'limited' | 'custom';

export interface PermissionPreset {
  id: PermissionTemplate;
  label: string;
  description: string;
  menus: string[];
  resourcePermissions?: Record<string, Permission>;
  buttonPermissions?: {
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canPrint: boolean;
  };
}

/**
 * قوالب صلاحيات جاهزة لتسهيل الإدارة
 */
export const PERMISSION_PRESETS: Record<UserRole, PermissionPreset[]> = {
  Admin: [
    {
      id: 'full',
      label: 'صلاحيات كاملة (افتراضي)',
      description: 'وصول كامل لجميع الصفحات والموارد',
      menus: ROLE_PAGES.Admin,
    }
  ],
  Sales: [
    {
      id: 'full',
      label: 'مبيعات - كامل (افتراضي)',
      description: 'وصول كامل لجميع صفحات المبيعات مع كل الصلاحيات',
      menus: ROLE_PAGES.Sales,
      buttonPermissions: {
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canPrint: true,
      }
    },
    {
      id: 'view-only',
      label: 'مبيعات - عرض فقط',
      description: 'عرض البيانات بدون إضافة أو تعديل أو حذف',
      menus: ['dashboard', 'customers', 'units', 'bookings', 'payments', 'sales'],
      resourcePermissions: {
        customers: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        units: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        bookings: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        payments: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        sales: { canView: true, canEdit: false, canDelete: false, canCreate: false },
      },
      buttonPermissions: {
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canExport: true,
        canPrint: true,
      }
    },
    {
      id: 'limited',
      label: 'مبيعات - محدود',
      description: 'صلاحيات محدودة للإضافة والتعديل فقط',
      menus: ['dashboard', 'customers', 'bookings'],
      resourcePermissions: {
        customers: { canView: true, canEdit: true, canDelete: false, canCreate: true },
        bookings: { canView: true, canEdit: true, canDelete: false, canCreate: true },
      },
      buttonPermissions: {
        canAdd: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canPrint: true,
      }
    }
  ],
  Accounting: [
    {
      id: 'full',
      label: 'محاسبة - كامل (افتراضي)',
      description: 'وصول كامل لجميع صفحات المحاسبة مع كل الصلاحيات',
      menus: ROLE_PAGES.Accounting,
      buttonPermissions: {
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canPrint: true,
      }
    },
    {
      id: 'view-only',
      label: 'محاسبة - عرض فقط',
      description: 'عرض البيانات المالية بدون تعديل أو حذف',
      menus: ['expense_dashboard', 'expenses', 'treasury', 'financial-reports'],
      resourcePermissions: {
        expenses: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        treasury: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        vendors: { canView: true, canEdit: false, canDelete: false, canCreate: false },
        employees: { canView: true, canEdit: false, canDelete: false, canCreate: false },
      },
      buttonPermissions: {
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canExport: true,
        canPrint: true,
      }
    },
    {
      id: 'limited',
      label: 'محاسبة - محدود',
      description: 'لوحة التحكم والمصروفات فقط مع إمكانية الإضافة والتعديل',
      menus: ['expense_dashboard', 'expenses'],
      resourcePermissions: {
        expenses: { canView: true, canEdit: true, canDelete: false, canCreate: true },
      },
      buttonPermissions: {
        canAdd: true,
        canEdit: true,
        canDelete: false,
        canExport: true,
        canPrint: true,
      }
    }
  ]
};

/**
 * تطبيق قالب صلاحيات على مستخدم
 */
export function applyPermissionPreset(
  role: UserRole,
  presetId: PermissionTemplate
): {
  menuAccess: UserMenuAccess[];
  resourcePermissions: UserResourcePermission[];
  buttonAccess: UserButtonAccess[];
} {
  const presets = PERMISSION_PRESETS[role];
  const preset = presets.find(p => p.id === presetId);
  
  if (!preset) {
    // افتراضياً، استخدام القالب الكامل
    const fullPreset = presets[0];
    return {
      menuAccess: fullPreset.menus.map(menuKey => ({
        userId: '',
        menuKey,
        isVisible: true
      })),
      resourcePermissions: [],
      buttonAccess: []
    };
  }
  
  const menuAccess: UserMenuAccess[] = preset.menus.map(menuKey => ({
    userId: '',
    menuKey,
    isVisible: true
  }));
  
  const resourcePermissions: UserResourcePermission[] = preset.resourcePermissions
    ? Object.entries(preset.resourcePermissions).map(([resource, perms]) => ({
        userId: '',
        resource,
        ...perms
      }))
    : [];
  
  // إضافة صلاحيات الأزرار من القالب
  const buttonAccess: UserButtonAccess[] = [];
  if (preset.buttonPermissions) {
    const buttons: Array<keyof typeof preset.buttonPermissions> = ['canAdd', 'canEdit', 'canDelete', 'canExport', 'canPrint'];
    const buttonKeys = {
      canAdd: 'add',
      canEdit: 'edit',
      canDelete: 'delete',
      canExport: 'export',
      canPrint: 'print'
    };
    
    buttons.forEach(btn => {
      buttonAccess.push({
        userId: '',
        pageKey: '*',
        buttonKey: buttonKeys[btn],
        isVisible: preset.buttonPermissions![btn]
      });
    });
  }
  
  return { menuAccess, resourcePermissions, buttonAccess };
}

/**
 * الحصول على القالب الحالي للمستخدم
 */
export function detectCurrentPreset(
  role: UserRole,
  menuAccess: UserMenuAccess[]
): PermissionTemplate {
  if (!menuAccess || menuAccess.length === 0) {
    return 'full'; // الافتراضي
  }
  
  const visibleMenus = menuAccess.filter(m => m.isVisible).map(m => m.menuKey).sort();
  const presets = PERMISSION_PRESETS[role];
  
  // تحقق من تطابق مع أحد القوالب
  for (const preset of presets) {
    const presetMenus = preset.menus.slice().sort();
    if (JSON.stringify(visibleMenus) === JSON.stringify(presetMenus)) {
      return preset.id;
    }
  }
  
  return 'custom'; // قالب مخصص
}

/**
 * فلترة البيانات حسب المشاريع المخصصة للمستخدم
 */
export const filterDataByUserProject = async <T extends { project_id?: string }>(
  data: T[],
  userId: string
): Promise<T[]> => {
  try {
    // الحصول على المشاريع المخصصة للمستخدم
    const assignments = await userFullPermissionsService.getUserProjectAssignments(userId);
    
    if (!assignments || assignments.length === 0) {
      // إذا لم يكن لديه مشاريع محددة، لا يعرض شيء
      return [];
    }
    
    // استخراج معرفات المشاريع
    const projectIds = assignments.map(a => a.project_id);
    
    // فلترة البيانات لتشمل فقط المشاريع المخصصة
    return data.filter(item => 
      item.project_id && projectIds.includes(item.project_id)
    );
  } catch (error) {
    console.error('Error filtering data by user projects:', error);
    return [];
  }
};

/**
 * فحص ما إذا كان المستخدم لديه صلاحية الوصول إلى مشروع معين
 */
export const canAccessProject = async (
  userId: string,
  projectId: string
): Promise<boolean> => {
  try {
    const assignments = await userFullPermissionsService.getUserProjectAssignments(userId);
    return assignments.some(a => a.project_id === projectId);
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
};
