import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseEnv } from './env';
import type { Database } from '../types/database';

export const supabase = hasSupabaseEnv()
  ? createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
