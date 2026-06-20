/**
 * Centralized environment configuration.
 * Copy .env.example → .env and set values before deployment.
 *
 * Values are read from EXPO_PUBLIC_* (Metro bundle) with fallback to
 * app.config.ts `extra` (loaded via dotenv at startup).
 */
import Constants from 'expo-constants';

type ExtraConfig = Record<string, string | undefined>;

const PLACEHOLDER_VALUES = new Set(['your_anon_key', 'your-anon-key', 'your_supabase_anon_key']);

function fromExtra(...keys: string[]): string {
  const extra = Constants.expoConfig?.extra as ExtraConfig | undefined;
  if (!extra) return '';
  for (const key of keys) {
    const value = extra[key]?.trim();
    if (value) return value;
  }
  return '';
}

function readEnv(primary: string, ...fallbackKeys: string[]): string {
  const fromProcess = process.env[primary]?.trim();
  if (fromProcess) return fromProcess;
  return fromExtra(primary, ...fallbackKeys);
}

function readSecret(primary: string, ...fallbackKeys: string[]): string {
  const value = readEnv(primary, ...fallbackKeys);
  if (!value) return '';
  if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return '';
  return value;
}

const apiUrl = readEnv('EXPO_PUBLIC_API_URL');
const aiApiUrl = readEnv('EXPO_PUBLIC_AI_API_URL');

/** True when a full Verdora REST backend URL is configured. */
export const hasRestApi = Boolean(apiUrl.trim());

/** True when the local/cloud AI proxy is configured (chat + crop scan only). */
export const hasAiApi = Boolean(aiApiUrl.trim());

export const env = {
  /** Base URL for full Verdora REST API (auth, calendar, admin — optional) */
  apiUrl: apiUrl.trim(),

  /** Base URL for AI proxy only (npm run api:dev → localhost:3001) */
  aiApiUrl: aiApiUrl.trim(),

  /** OpenWeather — live forecasts in Weather tab */
  openWeatherApiKey: readEnv('EXPO_PUBLIC_OPENWEATHER_API_KEY'),

  /** Grok (xAI) — AI chat assistant */
  grokApiKey: readEnv('EXPO_PUBLIC_GROK_API_KEY'),

  /** Z.ai — crop scan / disease analysis (vision) */
  zaiApiKey: readEnv('EXPO_PUBLIC_ZAI_API_KEY'),

  /** @deprecated Legacy Gemini — scanner uses Z.ai; kept for optional fallback docs */
  geminiApiKey: readEnv('EXPO_PUBLIC_GEMINI_API_KEY'),

  /** Supabase — required for auth and cloud data sync */
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readSecret(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ),

  /** Show demo login shortcuts and enable demo docs (set to 1 for tester builds) */
  demoMode: readEnv('EXPO_PUBLIC_DEMO_MODE') === '1',

  /** Tester feedback inbox for Profile mailto link */
  feedbackEmail: readEnv('EXPO_PUBLIC_FEEDBACK_EMAIL'),
} as const;
