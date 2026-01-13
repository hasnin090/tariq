/**
 * Application Constants - ثوابت التطبيق
 * جميع الثوابت المستخدمة في التطبيق
 */

// ==================== User Roles ====================
export const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ACCOUNTANT: 'Accountant',
  SALES: 'Sales',
  VIEWER: 'Viewer',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'مدير النظام',
  [USER_ROLES.MANAGER]: 'مدير',
  [USER_ROLES.ACCOUNTANT]: 'محاسب',
  [USER_ROLES.SALES]: 'مبيعات',
  [USER_ROLES.VIEWER]: 'مشاهد',
};

// ==================== Payment Types ====================
export const PAYMENT_TYPES = {
  CASH: 'cash',
  CHECK: 'check',
  BANK_TRANSFER: 'bank_transfer',
  INSTALLMENT: 'installment',
  DOWN_PAYMENT: 'down_payment',
} as const;

export type PaymentType = typeof PAYMENT_TYPES[keyof typeof PAYMENT_TYPES];

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PAYMENT_TYPES.CASH]: 'نقداً',
  [PAYMENT_TYPES.CHECK]: 'صك',
  [PAYMENT_TYPES.BANK_TRANSFER]: 'حوالة بنكية',
  [PAYMENT_TYPES.INSTALLMENT]: 'قسط',
  [PAYMENT_TYPES.DOWN_PAYMENT]: 'دفعة مقدمة',
};

// ==================== Extra Payment Types ====================
export const EXTRA_PAYMENT_TYPES = {
  MAINTENANCE: 'صيانة',
  PARKING: 'موقف سيارة',
  STORAGE: 'مخزن',
  GARDEN: 'حديقة',
  TERRACE: 'تراس',
  SERVICE_CHARGE: 'رسوم خدمات',
  LATE_FEE: 'غرامة تأخير',
  OTHER: 'أخرى',
} as const;

export type ExtraPaymentType = typeof EXTRA_PAYMENT_TYPES[keyof typeof EXTRA_PAYMENT_TYPES];

// ==================== Unit Status ====================
export const UNIT_STATUS = {
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  UNDER_CONSTRUCTION: 'under_construction',
} as const;

export type UnitStatusType = typeof UNIT_STATUS[keyof typeof UNIT_STATUS];

export const UNIT_STATUS_LABELS: Record<UnitStatusType, string> = {
  [UNIT_STATUS.AVAILABLE]: 'متاحة',
  [UNIT_STATUS.RESERVED]: 'محجوزة',
  [UNIT_STATUS.SOLD]: 'مباعة',
  [UNIT_STATUS.UNDER_CONSTRUCTION]: 'قيد الإنشاء',
};

export const UNIT_STATUS_COLORS: Record<UnitStatusType, string> = {
  [UNIT_STATUS.AVAILABLE]: 'bg-green-100 text-green-800',
  [UNIT_STATUS.RESERVED]: 'bg-yellow-100 text-yellow-800',
  [UNIT_STATUS.SOLD]: 'bg-red-100 text-red-800',
  [UNIT_STATUS.UNDER_CONSTRUCTION]: 'bg-blue-100 text-blue-800',
};

// ==================== Booking Status ====================
export const BOOKING_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
} as const;

export type BookingStatusType = typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_LABELS: Record<BookingStatusType, string> = {
  [BOOKING_STATUS.ACTIVE]: 'نشط',
  [BOOKING_STATUS.COMPLETED]: 'مكتمل',
  [BOOKING_STATUS.CANCELLED]: 'ملغي',
  [BOOKING_STATUS.PENDING]: 'قيد الانتظار',
};

// ==================== Scheduled Payment Status ====================
export const SCHEDULED_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
} as const;

export type ScheduledPaymentStatusType = typeof SCHEDULED_PAYMENT_STATUS[keyof typeof SCHEDULED_PAYMENT_STATUS];

export const SCHEDULED_PAYMENT_STATUS_LABELS: Record<ScheduledPaymentStatusType, string> = {
  [SCHEDULED_PAYMENT_STATUS.PENDING]: 'قيد الانتظار',
  [SCHEDULED_PAYMENT_STATUS.PAID]: 'مدفوع',
  [SCHEDULED_PAYMENT_STATUS.PARTIALLY_PAID]: 'مدفوع جزئياً',
  [SCHEDULED_PAYMENT_STATUS.OVERDUE]: 'متأخر',
  [SCHEDULED_PAYMENT_STATUS.CANCELLED]: 'ملغي',
};

export const SCHEDULED_PAYMENT_STATUS_COLORS: Record<ScheduledPaymentStatusType, string> = {
  [SCHEDULED_PAYMENT_STATUS.PENDING]: 'bg-yellow-100 text-yellow-800',
  [SCHEDULED_PAYMENT_STATUS.PAID]: 'bg-green-100 text-green-800',
  [SCHEDULED_PAYMENT_STATUS.PARTIALLY_PAID]: 'bg-blue-100 text-blue-800',
  [SCHEDULED_PAYMENT_STATUS.OVERDUE]: 'bg-red-100 text-red-800',
  [SCHEDULED_PAYMENT_STATUS.CANCELLED]: 'bg-gray-100 text-gray-800',
};

// ==================== Payment Plan Options ====================
export const PAYMENT_PLAN_YEARS = [4, 5] as const;
export type PaymentPlanYear = typeof PAYMENT_PLAN_YEARS[number];

export const PAYMENT_FREQUENCY_MONTHS = [1, 2, 3, 4, 5, 6, 12] as const;
export type PaymentFrequencyMonth = typeof PAYMENT_FREQUENCY_MONTHS[number];

export const PAYMENT_FREQUENCY_LABELS: Record<PaymentFrequencyMonth, string> = {
  1: 'شهري',
  2: 'كل شهرين',
  3: 'ربع سنوي',
  4: 'كل 4 أشهر',
  5: 'كل 5 أشهر',
  6: 'نصف سنوي',
  12: 'سنوي',
};

// ==================== Interface Modes ====================
export const INTERFACE_MODES = {
  PROJECTS: 'projects',
  EXPENSES: 'expenses',
} as const;

export type InterfaceMode = typeof INTERFACE_MODES[keyof typeof INTERFACE_MODES];

export const INTERFACE_MODE_LABELS: Record<InterfaceMode, string> = {
  [INTERFACE_MODES.PROJECTS]: 'المشاريع',
  [INTERFACE_MODES.EXPENSES]: 'المصروفات',
};

// ==================== Transaction Types ====================
export const TRANSACTION_TYPES = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  [TRANSACTION_TYPES.INCOME]: 'إيراد',
  [TRANSACTION_TYPES.EXPENSE]: 'مصروف',
  [TRANSACTION_TYPES.TRANSFER]: 'تحويل',
};

// ==================== Currency ====================
export const CURRENCIES = {
  IQD: 'IQD',
  USD: 'USD',
} as const;

export type Currency = typeof CURRENCIES[keyof typeof CURRENCIES];

export const CURRENCY_LABELS: Record<Currency, string> = {
  [CURRENCIES.IQD]: 'دينار عراقي',
  [CURRENCIES.USD]: 'دولار أمريكي',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [CURRENCIES.IQD]: 'د.ع',
  [CURRENCIES.USD]: '$',
};

// ==================== Notification Types ====================
export const NOTIFICATION_TYPES = {
  REMINDER: 'reminder',
  DUE_TODAY: 'due_today',
  OVERDUE: 'overdue',
  PASSWORD_RESET: 'password_reset',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ==================== Activity Log Actions ====================
export const LOG_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  VIEW: 'view',
  EXPORT: 'export',
  IMPORT: 'import',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type LogAction = typeof LOG_ACTIONS[keyof typeof LOG_ACTIONS];

export const LOG_ACTION_LABELS: Record<LogAction, string> = {
  [LOG_ACTIONS.CREATE]: 'إنشاء',
  [LOG_ACTIONS.UPDATE]: 'تحديث',
  [LOG_ACTIONS.DELETE]: 'حذف',
  [LOG_ACTIONS.LOGIN]: 'تسجيل دخول',
  [LOG_ACTIONS.LOGOUT]: 'تسجيل خروج',
  [LOG_ACTIONS.VIEW]: 'عرض',
  [LOG_ACTIONS.EXPORT]: 'تصدير',
  [LOG_ACTIONS.IMPORT]: 'استيراد',
  [LOG_ACTIONS.APPROVE]: 'موافقة',
  [LOG_ACTIONS.REJECT]: 'رفض',
};

// ==================== Entity Types ====================
export const ENTITY_TYPES = {
  USER: 'user',
  CUSTOMER: 'customer',
  UNIT: 'unit',
  BOOKING: 'booking',
  PAYMENT: 'payment',
  EXPENSE: 'expense',
  PROJECT: 'project',
  DOCUMENT: 'document',
  ACCOUNT: 'account',
  TRANSACTION: 'transaction',
} as const;

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  [ENTITY_TYPES.USER]: 'مستخدم',
  [ENTITY_TYPES.CUSTOMER]: 'عميل',
  [ENTITY_TYPES.UNIT]: 'وحدة',
  [ENTITY_TYPES.BOOKING]: 'حجز',
  [ENTITY_TYPES.PAYMENT]: 'دفعة',
  [ENTITY_TYPES.EXPENSE]: 'مصروف',
  [ENTITY_TYPES.PROJECT]: 'مشروع',
  [ENTITY_TYPES.DOCUMENT]: 'مستند',
  [ENTITY_TYPES.ACCOUNT]: 'حساب',
  [ENTITY_TYPES.TRANSACTION]: 'معاملة',
};

// ==================== Menu Keys ====================
export const MENU_KEYS = {
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  UNITS: 'units',
  CUSTOMERS: 'customers',
  BOOKINGS: 'bookings',
  PAYMENTS: 'payments',
  SCHEDULED_PAYMENTS: 'scheduled-payments',
  EXPENSES: 'expenses',
  CATEGORY_ACCOUNTING: 'category-accounting',
  TREASURY: 'treasury',
  DOCUMENTS: 'documents',
  REPORTS: 'reports',
  USERS: 'users',
  SETTINGS: 'settings',
  ACTIVITY_LOGS: 'activity-logs',
} as const;

export type MenuKey = typeof MENU_KEYS[keyof typeof MENU_KEYS];

// ==================== Pagination ====================
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100] as const,
} as const;

// ==================== File Upload ====================
export const FILE_UPLOAD = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// ==================== Date Formats ====================
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  API: 'yyyy-MM-dd',
  DATETIME_DISPLAY: 'dd/MM/yyyy HH:mm',
  DATETIME_API: "yyyy-MM-dd'T'HH:mm:ss",
} as const;

// ==================== Storage Buckets ====================
export const STORAGE_BUCKETS = {
  DOCUMENTS: 'documents',
  ATTACHMENTS: 'attachments',
  AVATARS: 'avatars',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];
