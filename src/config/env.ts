/**
 * Centralized environment configuration.
 * Copy .env.example → .env and set values for production APIs.
 */
export const env = {
  /** Base URL for Verdora backend (REST) */
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.verdora.mock',

  /** When true, all services use local mocks (no network required) */
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API !== 'false',

  openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '',
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',

  /** Optional Supabase/Firebase placeholders for future auth migration */
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;
