/**
 * Input Validation & Sanitization
 * حماية من XSS, SQL Injection, وأخطاء البيانات
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * تنظيف النصوص من HTML/JavaScript خطير
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * التحقق من البريد الإلكتروني
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'البريد الإلكتروني مطلوب' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'البريد الإلكتروني غير صالح' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'البريد الإلكتروني طويل جداً' };
  }

  return { valid: true };
}

/**
 * التحقق من اسم المستخدم
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username) {
    return { valid: false, error: 'اسم المستخدم مطلوب' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' };
  }

  if (username.length > 50) {
    return { valid: false, error: 'اسم المستخدم طويل جداً' };
  }

  // فقط أحرف، أرقام، underscore، والأحرف العربية
  const usernameRegex = /^[a-zA-Z0-9_\u0600-\u06FF]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'اسم المستخدم يجب أن يحتوي على أحرف وأرقام فقط' };
  }

  return { valid: true };
}

/**
 * التحقق من كلمة المرور
 * متطلبات: 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم
 */
export function validatePassword(password: string): { valid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } {
  if (!password) {
    return { valid: false, error: 'كلمة المرور مطلوبة' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'كلمة المرور طويلة جداً' };
  }

  // التحقق من وجود حرف كبير
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)' };
  }

  // التحقق من وجود حرف صغير
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)' };
  }

  // التحقق من وجود رقم
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)' };
  }

  // التحقق من كلمات المرور الشائعة الضعيفة
  const weakPasswords = ['12345678', 'password', 'Password1', 'Qwerty123', 'Admin123', 'admin123'];
  if (weakPasswords.includes(password)) {
    return { valid: false, error: 'كلمة المرور شائعة جداً وسهلة التخمين' };
  }

  // حساب قوة كلمة المرور
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length >= 12 && hasSpecialChar) {
    strength = 'strong';
  } else if (password.length >= 10 || hasSpecialChar) {
    strength = 'medium';
  }

  return { valid: true, strength };
}

/**
 * التحقق من الاسم
 */
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: false, error: 'الاسم مطلوب' };
  }

  if (name.length < 2) {
    return { valid: false, error: 'الاسم قصير جداً' };
  }

  if (name.length > 100) {
    return { valid: false, error: 'الاسم طويل جداً' };
  }

  return { valid: true };
}

/**
 * التحقق من رقم الهاتف
 */
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone) {
    return { valid: false, error: 'رقم الهاتف مطلوب' };
  }

  // قبول أرقام وعلامات + - () مسافات
  const phoneRegex = /^[\d\s()+\-]+$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'رقم الهاتف يحتوي على أحرف غير صالحة' };
  }

  // حذف المسافات والرموز
  const digitsOnly = phone.replace(/[\s()+\-]/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return { valid: false, error: 'رقم الهاتف يجب أن يكون بين 8 و 15 رقم' };
  }

  return { valid: true };
}

/**
 * التحقق من المبلغ
 */
export function validateAmount(amount: number | string): { valid: boolean; error?: string } {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) {
    return { valid: false, error: 'المبلغ غير صالح' };
  }

  if (num < 0) {
    return { valid: false, error: 'المبلغ لا يمكن أن يكون سالباً' };
  }

  if (num > 999999999999) {
    return { valid: false, error: 'المبلغ كبير جداً' };
  }

  return { valid: true };
}

/**
 * التحقق من التاريخ
 */
export function validateDate(date: string): { valid: boolean; error?: string } {
  if (!date) {
    return { valid: false, error: 'التاريخ مطلوب' };
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'التاريخ غير صالح' };
  }

  // التحقق من التاريخ في المستقبل البعيد
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 100);
  if (parsedDate > maxDate) {
    return { valid: false, error: 'التاريخ بعيد جداً في المستقبل' };
  }

  return { valid: true };
}

/**
 * التحقق من نص عام (مع حد أقصى)
 */
export function validateText(text: string, maxLength: number = 1000): { valid: boolean; error?: string } {
  if (!text) {
    return { valid: true }; // النص الفارغ مقبول
  }

  if (text.length > maxLength) {
    return { valid: false, error: `النص طويل جداً (الحد الأقصى ${maxLength} حرف)` };
  }

  return { valid: true };
}

/**
 * تنظيف كائن من القيم الخطرة
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeText(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  
  return sanitized;
}
