/**
 * Centralized environment configuration.
 * Copy .env.example → .env and set values before deployment.
 */

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

/** True when a REST backend URL is configured. */
export const hasRestApi = Boolean(apiUrl.trim());

export const env = {
  /** Base URL for Verdora REST API (optional if using Supabase Auth + data) */
  apiUrl: apiUrl.trim(),

  openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',

  /** Supabase — required for auth and cloud data sync */
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;
