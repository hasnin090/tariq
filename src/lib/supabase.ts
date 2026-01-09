import { createClient } from '@supabase/supabase-js';

// ✅ قراءة المتغيرات بشكل آمن مع قيم افتراضية
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// ✅ التحقق قبل التهيئة
if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is missing!');
  throw new Error(
    'Missing VITE_SUPABASE_ANON_KEY environment variable. Please configure it in Netlify environment variables.'
  );
}

// ✅ التهيئة المباشرة بدون const منفصل
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // ✅ إضافة storage لحفظ الجلسة
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    // ✅ إضافة flowType لتحسين المصادقة
    flowType: 'pkce',
  },
  // ✅ إضافة إعدادات realtime لمنع انقطاع الاتصال
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
  // ✅ إضافة global settings
  global: {
    headers: {
      'x-client-info': 'real-estate-dashboard',
    },
  },
});