import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../config/env';

let client: SupabaseClient | null = null;

/** True when Supabase URL and anon key are configured */
export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Shared Supabase client — null if not configured (local-only mode) */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
