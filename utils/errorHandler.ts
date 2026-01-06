/**
 * Error Handler Utility
 * يوفر معالجة مركزية للأخطاء مع رسائل واضحة للمستخدم
 */

// أنواع الأخطاء المعروفة
export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'STORAGE_ERROR'
  | 'PERMISSION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'UNKNOWN_ERROR';

// رسائل الخطأ بالعربية
const ERROR_MESSAGES: Record<ErrorType, string> = {
  NETWORK_ERROR: 'فشل الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت.',
  AUTH_ERROR: 'فشل المصادقة. يرجى تسجيل الدخول مرة أخرى.',
  VALIDATION_ERROR: 'البيانات المدخلة غير صالحة. يرجى مراجعة المدخلات.',
  DATABASE_ERROR: 'حدث خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى.',
  STORAGE_ERROR: 'حدث خطأ في التخزين. يرجى المحاولة مرة أخرى.',
  PERMISSION_ERROR: 'ليس لديك صلاحية للقيام بهذه العملية.',
  NOT_FOUND_ERROR: 'العنصر المطلوب غير موجود.',
  RATE_LIMIT_ERROR: 'تم تجاوز الحد المسموح من المحاولات. يرجى الانتظار قليلاً.',
  UNKNOWN_ERROR: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
};

// رسائل خطأ Supabase المحددة
const SUPABASE_ERROR_MAP: Record<string, { type: ErrorType; message: string }> = {
  'Failed to fetch': { type: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR },
  'NetworkError': { type: 'NETWORK_ERROR', message: ERROR_MESSAGES.NETWORK_ERROR },
  'JWT expired': { type: 'AUTH_ERROR', message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى.' },
  'Invalid JWT': { type: 'AUTH_ERROR', message: 'جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.' },
  'Invalid login credentials': { type: 'AUTH_ERROR', message: 'بيانات تسجيل الدخول غير صحيحة.' },
  'User not found': { type: 'NOT_FOUND_ERROR', message: 'المستخدم غير موجود.' },
  'Email not confirmed': { type: 'AUTH_ERROR', message: 'لم يتم تأكيد البريد الإلكتروني بعد.' },
  'duplicate key': { type: 'DATABASE_ERROR', message: 'هذا العنصر موجود بالفعل.' },
  'violates foreign key': { type: 'DATABASE_ERROR', message: 'لا يمكن الحذف - هناك عناصر مرتبطة.' },
  'violates check constraint': { type: 'VALIDATION_ERROR', message: 'القيمة المدخلة غير مسموح بها.' },
  'new row violates row-level security': { type: 'PERMISSION_ERROR', message: 'ليس لديك صلاحية للقيام بهذه العملية.' },
  'permission denied': { type: 'PERMISSION_ERROR', message: 'ليس لديك صلاحية للقيام بهذه العملية.' },
  'rate limit': { type: 'RATE_LIMIT_ERROR', message: ERROR_MESSAGES.RATE_LIMIT_ERROR },
  'Bucket not found': { type: 'STORAGE_ERROR', message: 'مجلد التخزين غير موجود.' },
  'Object not found': { type: 'NOT_FOUND_ERROR', message: 'الملف غير موجود.' },
  'The resource already exists': { type: 'DATABASE_ERROR', message: 'هذا العنصر موجود بالفعل.' },
};

export interface ParsedError {
  type: ErrorType;
  message: string;
  originalError?: unknown;
  details?: string;
}

/**
 * تحليل الخطأ واستخراج نوعه ورسالته
 */
export function parseError(error: unknown): ParsedError {
  // إذا كان الخطأ null أو undefined
  if (!error) {
    return {
      type: 'UNKNOWN_ERROR',
      message: ERROR_MESSAGES.UNKNOWN_ERROR
    };
  }

  // إذا كان الخطأ نص
  if (typeof error === 'string') {
    return matchErrorMessage(error, error);
  }

  // إذا كان الخطأ كائن Error
  if (error instanceof Error) {
    const errorMessage = error.message;
    
    // التحقق من أخطاء الشبكة
    if (error.name === 'TypeError' && errorMessage.includes('fetch')) {
      return {
        type: 'NETWORK_ERROR',
        message: ERROR_MESSAGES.NETWORK_ERROR,
        originalError: error
      };
    }

    return matchErrorMessage(errorMessage, error);
  }

  // إذا كان الخطأ كائن Supabase
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    
    // خطأ Supabase النموذجي
    if ('message' in errorObj && typeof errorObj.message === 'string') {
      return matchErrorMessage(errorObj.message, error, errorObj.code as string);
    }

    // خطأ PostgreSQL
    if ('details' in errorObj || 'hint' in errorObj) {
      const message = (errorObj.message || errorObj.details || errorObj.hint) as string;
      return matchErrorMessage(message || '', error);
    }
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError: error
  };
}

/**
 * مطابقة رسالة الخطأ مع الأنواع المعروفة
 */
function matchErrorMessage(errorMessage: string, originalError: unknown, errorCode?: string): ParsedError {
  // البحث في خريطة الأخطاء
  for (const [key, value] of Object.entries(SUPABASE_ERROR_MAP)) {
    if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
      return {
        type: value.type,
        message: value.message,
        originalError,
        details: errorMessage
      };
    }
  }

  // التحقق من رمز الخطأ
  if (errorCode) {
    if (errorCode.startsWith('23')) {
      // أخطاء القيود في PostgreSQL
      return {
        type: 'DATABASE_ERROR',
        message: 'لا يمكن إتمام العملية - هناك تعارض في البيانات.',
        originalError,
        details: errorMessage
      };
    }
    if (errorCode === '42501') {
      return {
        type: 'PERMISSION_ERROR',
        message: ERROR_MESSAGES.PERMISSION_ERROR,
        originalError
      };
    }
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: errorMessage || ERROR_MESSAGES.UNKNOWN_ERROR,
    originalError
  };
}

/**
 * تسجيل الخطأ في وحدة التحكم (للتطوير فقط)
 */
export function logError(context: string, error: unknown, parsedError?: ParsedError): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`❌ Error in ${context}`);
    if (parsedError) {
      console.log('Type:', parsedError.type);
      console.log('Message:', parsedError.message);
      if (parsedError.details) {
        console.log('Details:', parsedError.details);
      }
    }
    console.error('Original Error:', error);
    console.groupEnd();
  }
}

/**
 * معالج الخطأ الشامل
 * يحلل الخطأ ويسجله ويعيد رسالة مناسبة للمستخدم
 */
export function handleError(
  error: unknown,
  context: string,
  options?: {
    showToast?: (message: string, type: 'error' | 'warning') => void;
    silent?: boolean;
  }
): ParsedError {
  const parsedError = parseError(error);
  
  // تسجيل الخطأ
  if (!options?.silent) {
    logError(context, error, parsedError);
  }

  // عرض Toast إذا تم توفير الدالة
  if (options?.showToast) {
    const toastType = parsedError.type === 'VALIDATION_ERROR' ? 'warning' : 'error';
    options.showToast(parsedError.message, toastType);
  }

  return parsedError;
}

/**
 * إنشاء رسالة خطأ للعرض
 */
export function getErrorMessage(error: unknown): string {
  return parseError(error).message;
}

/**
 * التحقق مما إذا كان الخطأ من نوع معين
 */
export function isErrorType(error: unknown, type: ErrorType): boolean {
  return parseError(error).type === type;
}

/**
 * إنشاء خطأ مخصص
 */
export class AppError extends Error {
  type: ErrorType;
  
  constructor(message: string, type: ErrorType = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'AppError';
    this.type = type;
  }
}

/**
 * أخطاء محددة
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = ERROR_MESSAGES.AUTH_ERROR) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string = ERROR_MESSAGES.PERMISSION_ERROR) {
    super(message, 'PERMISSION_ERROR');
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND_ERROR) {
    super(message, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}
