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

  /** OpenWeather — live forecasts in Weather tab */
  openWeatherApiKey: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? '',

  /** Claude (Anthropic) — AI chat assistant */
  claudeApiKey: process.env.EXPO_PUBLIC_CLAUDE_API_KEY ?? '',

  /** Gemini — crop scan / disease analysis (vision) */
  geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '',

  /** Supabase — required for auth and cloud data sync */
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',

  /** Show demo login shortcuts and enable demo docs (set to 1 for tester builds) */
  demoMode: process.env.EXPO_PUBLIC_DEMO_MODE === '1',

  /** Tester feedback inbox for Profile mailto link */
  feedbackEmail: process.env.EXPO_PUBLIC_FEEDBACK_EMAIL ?? '',
} as const;
