import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local'
  );
}

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