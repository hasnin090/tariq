/**
 * Development Logger Utility
 * 
 * يوفر دوال logging آمنة تعمل فقط في بيئة التطوير
 * ويمنع تسريب المعلومات الحساسة في الإنتاج
 */

const isDevelopment = import.meta.env.MODE === 'development';

/**
 * تسجيل رسالة معلوماتية (فقط في التطوير)
 */
export const devLog = (...args: any[]): void => {
  if (isDevelopment) {
    console.log('[DEV]', ...args);
  }
};

/**
 * تسجيل تحذير (فقط في التطوير)
 */
export const devWarn = (...args: any[]): void => {
  if (isDevelopment) {
    console.warn('[DEV WARNING]', ...args);
  }
};

/**
 * تسجيل خطأ (فقط في التطوير)
 * في الإنتاج، يمكن إرسال الخطأ إلى خدمة monitoring
 */
export const devError = (error: any, context?: string): void => {
  if (isDevelopment) {
    console.error('[DEV ERROR]', context ? `[${context}]` : '', error);
  } else {
    // في الإنتاج، يمكن إرسال الخطأ إلى خدمة مثل Sentry
    // sendToErrorTracking(error, context);
  }
};

/**
 * تسجيل جدول (فقط في التطوير)
 */
export const devTable = (data: any): void => {
  if (isDevelopment) {
    console.table(data);
  }
};

/**
 * تسجيل مجموعة (فقط في التطوير)
 */
export const devGroup = (label: string, callback: () => void): void => {
  if (isDevelopment) {
    console.group(label);
    callback();
    console.groupEnd();
  }
};

/**
 * قياس الأداء (فقط في التطوير)
 */
export const devTime = (label: string): void => {
  if (isDevelopment) {
    console.time(label);
  }
};

export const devTimeEnd = (label: string): void => {
  if (isDevelopment) {
    console.timeEnd(label);
  }
};

/**
 * تسجيل حالة Redux/State (فقط في التطوير)
 */
export const devState = (stateName: string, state: any): void => {
  if (isDevelopment) {
    console.log(`[STATE: ${stateName}]`, state);
  }
};

export default {
  log: devLog,
  warn: devWarn,
  error: devError,
  table: devTable,
  group: devGroup,
  time: devTime,
  timeEnd: devTimeEnd,
  state: devState,
  isDevelopment
};
