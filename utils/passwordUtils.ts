import bcrypt from 'bcryptjs';

/**
 * عدد جولات الـ salt (10 يوفر توازن جيد بين الأمان والأداء)
 */
const SALT_ROUNDS = 10;

/**
 * تشفير كلمة المرور باستخدام bcrypt
 * @param plainPassword - كلمة المرور النصية
 * @returns Promise<string> - كلمة المرور المشفرة (hash)
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    console.error('خطأ في تشفير كلمة المرور:', error);
    throw new Error('فشل تشفير كلمة المرور');
  }
}

/**
 * التحقق من كلمة المرور
 * @param plainPassword - كلمة المرور النصية المدخلة
 * @param hashedPassword - كلمة المرور المشفرة المخزنة في قاعدة البيانات
 * @returns Promise<boolean> - true إذا كانت كلمة المرور صحيحة
 */
export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    console.error('خطأ في التحقق من كلمة المرور:', error);
    return false;
  }
}

/**
 * التحقق من قوة كلمة المرور
 * @param password - كلمة المرور للتحقق منها
 * @returns object - نتيجة التحقق وتفاصيل القوة
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  // الحد الأدنى للطول
  if (password.length < 8) {
    errors.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
  }

  // التحقق من وجود أرقام
  if (!/\d/.test(password)) {
    errors.push('يجب أن تحتوي كلمة المرور على رقم واحد على الأقل');
  }

  // التحقق من وجود حروف
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('يجب أن تحتوي كلمة المرور على حرف واحد على الأقل');
  }

  // تحديد قوة كلمة المرور
  if (password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    strength = 'strong';
  } else if (password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)) {
    strength = 'medium';
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength
  };
}
