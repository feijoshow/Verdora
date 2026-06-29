/**
 * Centralized environment configuration.
 * Copy .env.example → .env and set values before deployment.
 *
 * Values are read from EXPO_PUBLIC_* (Metro bundle) with fallback to
 * app.config.ts `extra` (loaded via dotenv at startup).
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

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

/** Dev-only AI proxy URLs — unreachable from physical devices. */
function isLocalAiProxyUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('10.0.2.2') ||
    lower.includes('[::1]')
  );
}

function resolveAiApiUrl(): string {
  const raw = readEnv('EXPO_PUBLIC_AI_API_URL').trim();
  if (!raw) return '';
  if (Platform.OS !== 'web' && isLocalAiProxyUrl(raw)) return '';
  return raw;
}

const apiUrl = readEnv('EXPO_PUBLIC_API_URL');
const aiApiUrl = resolveAiApiUrl();

/** True when a full Verdora REST backend URL is configured. */
export const hasRestApi = Boolean(apiUrl.trim());

/** True when the local/cloud AI proxy is configured (chat + crop scan only). */
export const hasAiApi = Boolean(aiApiUrl);

export const env = {
  /** Base URL for full Verdora REST API (auth, calendar, admin — optional) */
  apiUrl: apiUrl.trim(),

  /** Base URL for AI proxy (local dev or Render in production) */
  aiApiUrl,

  /** OpenWeather — live forecasts in Weather tab */
  openWeatherApiKey: readEnv('EXPO_PUBLIC_OPENWEATHER_API_KEY'),

  /** Grok (xAI) — AI chat assistant (direct fallback when no API proxy) */
  grokApiKey: readEnv('EXPO_PUBLIC_GROK_API_KEY'),

  /** Z.ai — crop scan (direct fallback when no API proxy) */
  zaiApiKey: readEnv('EXPO_PUBLIC_ZAI_API_KEY'),

  /** @deprecated Legacy Gemini — scanner uses Z.ai */
  geminiApiKey: readEnv('EXPO_PUBLIC_GEMINI_API_KEY'),

  /** Supabase — required for auth and cloud data sync */
  supabaseUrl: readEnv('EXPO_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readSecret(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ),

  /** Show demo shortcuts (set EXPO_PUBLIC_DEMO_MODE=1 for tester builds) */
  demoMode: readEnv('EXPO_PUBLIC_DEMO_MODE') === '1',

  /** Tester feedback inbox for Profile mailto link */
  feedbackEmail: readEnv('EXPO_PUBLIC_FEEDBACK_EMAIL'),
} as const;

/** Whether crop scan / chat can run on this device (API proxy or direct keys). */
export const hasMobileAi =
  hasAiApi || Boolean(env.zaiApiKey.trim()) || Boolean(env.grokApiKey.trim());
