import type { ExpoConfig, ConfigContext } from '@expo/config';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const loadDotEnv = (): void => {
  // EAS / Vercel inject env at build time — do not merge dev .env (often has localhost).
  if (process.env.EAS_BUILD === 'true' || process.env.VERCEL === '1') return;

  const cwd = process.cwd();
  const envProductionPath = resolve(cwd, '.env.production');
  const envLocalPath = resolve(cwd, '.env.local');
  const envPath = resolve(cwd, '.env');

  if (process.env.NODE_ENV === 'production' && existsSync(envProductionPath)) {
    loadEnv({ path: envProductionPath });
  }

  if (existsSync(envLocalPath)) {
    loadEnv({ path: envLocalPath });
  }

  if (existsSync(envPath)) {
    loadEnv({ path: envPath });
  }
};

loadDotEnv();

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? '',
  slug: config.slug ?? config.name ?? '',
  extra: {
    ...config.extra,
    EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
    EXPO_PUBLIC_AI_API_URL: process.env.EXPO_PUBLIC_AI_API_URL,
    EXPO_PUBLIC_OPENWEATHER_API_KEY: process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY,
    EXPO_PUBLIC_GROK_API_KEY: process.env.EXPO_PUBLIC_GROK_API_KEY,
    EXPO_PUBLIC_ZAI_API_KEY: process.env.EXPO_PUBLIC_ZAI_API_KEY,
    EXPO_PUBLIC_GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_DEMO_MODE: process.env.EXPO_PUBLIC_DEMO_MODE,
    EXPO_PUBLIC_FEEDBACK_EMAIL: process.env.EXPO_PUBLIC_FEEDBACK_EMAIL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
});
