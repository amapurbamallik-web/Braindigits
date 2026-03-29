import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    storageKey: 'braindigits-auth-v4',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
  },
  global: {
    headers: {
      // Hint to Supabase PostgREST to use the prepared statement cache — faster repeat queries
      'Accept-Profile': 'public',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    // Reduce heartbeat to detect drops faster
    params: {
      heartbeatIntervalMs: 15000,
    },
  },
});