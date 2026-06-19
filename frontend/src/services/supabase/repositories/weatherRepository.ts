import type { User, WeatherData } from '../../../types';
import type { DbWeatherLog, InsertDbWeatherLog } from '../../../types/database';
import { generateId } from '../../../utils/generateId';
import { getSupabase } from '../client';

export function weatherToLogRow(user: User, weather: WeatherData): InsertDbWeatherLog {
  return {
    id: generateId('wlog'),
    user_id: user.id,
    location: weather.location,
    temperature: weather.temperature,
    humidity: weather.humidity,
    condition: weather.condition,
    recommendation_shown: weather.recommendation ?? null,
    rainfall_mm: null,
    logged_at: new Date().toISOString(),
  };
}

export async function insertWeatherLog(user: User, weather: WeatherData): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from('weather_logs').insert(weatherToLogRow(user, weather));
  if (error) console.warn('[Verdora] Supabase weather_logs insert:', error.message);
}

export async function fetchAllWeatherLogs(): Promise<DbWeatherLog[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('weather_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data ?? []) as DbWeatherLog[];
}

export async function fetchWeatherLogsByUser(userId: string): Promise<DbWeatherLog[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('weather_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbWeatherLog[];
}
