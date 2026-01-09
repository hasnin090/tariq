import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ✅ متغير لحفظ الـ instance
let supabaseInstance: SupabaseClient | null = null;

// ✅ دالة للحصول على client (lazy initialization)
function getSupabaseClient(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dlxtduzxlwogpwxjeqxm.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseAnonKey) {
    console.error('❌ VITE_SUPABASE_ANON_KEY is missing!');
    throw new Error(
      'Missing VITE_SUPABASE_ANON_KEY environment variable. Please configure it in Netlify environment variables.'
    );
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'pkce',
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
    global: {
      headers: {
        'x-client-info': 'real-estate-dashboard',
      },
    },
  });

  return supabaseInstance;
}

// ✅ Export الـ client عبر getter
export const supabase = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});