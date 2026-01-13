/**
 * Services Index - تصدير جميع الخدمات
 * نقطة الدخول المركزية لجميع خدمات التطبيق
 */

// ==================== Core ====================
export { supabase, generateUniqueId, generateUUID } from './core/supabaseClient';
export * from './core/validation';

// ==================== Users Service ====================
export { 
  usersService
} from './modules/usersService';

// ==================== Customers Service ====================
export { customersService } from './modules/customersService';

// ==================== Units Service ====================
export { 
  unitsService,
  unitTypesService,
  unitStatusesService 
} from './modules/unitsService';

// ==================== Bookings Service ====================
export { bookingsService } from './modules/bookingsService';

// ==================== Projects Service ====================
export { projectsService } from './modules/projectsService';

// ==================== Payments Service ====================
export { 
  paymentsService,
  extraPaymentsService,
  paymentAttachmentsService 
} from './modules/paymentsService';

// ==================== Scheduled Payments Service ====================
export { 
  scheduledPaymentsService,
  paymentNotificationsService 
} from './modules/scheduledPaymentsService';

// ==================== Expenses Service ====================
export { 
  expensesService,
  expenseCategoriesService,
  vendorsService 
} from './modules/expensesService';

// ==================== Treasury Service ====================
export { 
  accountsService,
  transactionsService 
} from './modules/treasuryService';

// ==================== Permissions Service ====================
export { 
  userPermissionsService,
  userMenuAccessService,
  userButtonAccessService,
  userProjectAssignmentsService,
  userFullPermissionsService 
} from './modules/permissionsService';

// ==================== Documents Service ====================
export { 
  documentsService,
  documentFoldersService,
  documentCategoriesService,
  storageService 
} from './modules/documentsService';

// ==================== Activity Logs Service ====================
export { activityLogsService } from './modules/activityLogsService';

// ==================== Type Re-exports for Convenience ====================
export type {
  User,
  Customer,
  Unit,
  UnitType,
  UnitStatus,
  Booking,
  Payment,
  ExtraPayment,
  PaymentAttachment,
  ScheduledPayment,
  PaymentNotification,
  Expense,
  ExpenseCategory,
  Vendor,
  Project,
  Account,
  Transaction,
  Document,
  DocumentFolder,
  DocumentCategory,
  ActivityLog,
  UserMenuAccess,
  UserButtonAccess,
  UserProjectAssignment,
  UserResourcePermission,
} from '../../types';
