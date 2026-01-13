/**
 * Supabase Client - النواة المركزية
 * يوفر اتصال Supabase موحد لجميع الخدمات
 */

import { supabase } from '../../lib/supabase';

// Re-export supabase client
export { supabase };

/**
 * توليد معرف فريد
 */
export const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const counter = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}_${counter}`;
};

/**
 * توليد UUID v4
 */
export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * مقارنة الأرقام بتسامح صغير
 */
export const nearlyEqual = (a: number, b: number, epsilon: number = 0.01): boolean => {
  return Math.abs(a - b) < epsilon;
};
