/**
 * ✅ ملف موحد لتوليد المعرّفات الفريدة
 * يُستخدم في جميع أنحاء التطبيق لتجنب تكرار الكود
 */

/**
 * توليد معرّف فريد مع بادئة مخصصة
 * @param prefix البادئة للمعرّف (مثل: customer, unit, payment)
 * @returns معرّف فريد بالتنسيق: prefix_timestamp_random_counter
 */
export const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}_${counter}`;
};

/**
 * توليد UUID v4 قياسي
 * يستخدم crypto.randomUUID() إذا كان متاحاً، مع fallback يدوي
 * @returns UUID بالتنسيق: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export const generateUUID = (): string => {
  // استخدام crypto.randomUUID() الأصلي إذا كان متاحاً
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // توليد UUID v4 يدوياً للمتصفحات القديمة
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * توليد معرّف قصير للاستخدام المؤقت
 * @returns معرّف من 8 أحرف
 */
export const generateShortId = (): string => {
  return Math.random().toString(36).substring(2, 10);
};
