import { hasRestApi, env } from '../../config/env';
import type { User, WeatherData } from '../../types';
import { getLastEnvironmentLog, getUserFarmingRecords } from '../analytics/dataCollectionService';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiGet, externalClient } from './client';
import type { PlantingRecommendation, WeatherQueryParams, WeatherResponse } from './types';

function derivePlantingRecommendation(temp?: number, humidity?: number): string {
  if (temp == null || humidity == null) {
    return 'Check conditions daily before field work.';
  }
  if (temp >= 28 && humidity > 75) {
    return 'High humidity — delay spraying; favorable for rice transplanting if fields are ready.';
  }
  if (temp >= 20 && temp <= 30 && humidity < 70) {
    return 'Good conditions for transplanting vegetables and direct-seeding.';
  }
  return 'Monitor forecast daily; protect seedlings from midday heat stress.';
}

function buildCropRecommendations(
  crops: string[],
  temp: number,
  humidity: number,
): PlantingRecommendation[] {
  return crops.map((cropName) => {
    let status: PlantingRecommendation['status'] = 'ideal';
    let reason = `Current ${temp}°C and ${humidity}% humidity suit ${cropName} in your area.`;

    if (humidity > 80) {
      status = 'caution';
      reason = `High humidity increases fungal risk for ${cropName} — ensure ventilation.`;
    }
    if (temp > 35) {
      status = 'avoid';
      reason = `Heat stress likely for ${cropName} — irrigate early morning or evening.`;
    }

    return { cropName, status, reason };
  });
}

async function openWeatherGetCurrent(params: WeatherQueryParams): Promise<WeatherData> {
  const { openWeatherApiKey } = env;
  if (!openWeatherApiKey) throw new Error('EXPO_PUBLIC_OPENWEATHER_API_KEY is not set');

  const query = params.city
    ? { q: params.city, appid: openWeatherApiKey, units: 'metric' }
    : { lat: params.lat, lon: params.lon, appid: openWeatherApiKey, units: 'metric' };

  const { data } = await externalClient.get(EXTERNAL_APIS.openWeather, { params });

  return {
    location: data.name ?? params.city ?? 'Unknown',
    temperature: Math.round(data.main?.temp ?? 0),
    humidity: data.main?.humidity ?? 0,
    condition: data.weather?.[0]?.description ?? 'Unknown',
    icon: data.weather?.[0]?.icon ?? '01d',
    recommendation: derivePlantingRecommendation(data.main?.temp, data.main?.humidity),
  };
}

async function weatherFromLastLog(user: User): Promise<WeatherResponse | null> {
  const log = await getLastEnvironmentLog(user.id);
  if (!log) return null;

  const farming = await getUserFarmingRecords(user.id);
  const crops = [...new Set(farming.map((r) => r.cropName))];

  return {
    location: log.location,
    temperature: log.temperature,
    humidity: log.humidity,
    condition: log.condition,
    icon: 'cached',
    recommendation: derivePlantingRecommendation(log.temperature, log.humidity),
    plantingWindows:
      crops.length > 0
        ? buildCropRecommendations(crops, log.temperature, log.humidity)
        : [],
  };
}

async function apiGetWeather(params?: WeatherQueryParams): Promise<WeatherResponse> {
  return apiGet<WeatherResponse>(API_ENDPOINTS.weather.current, { params });
}

export async function getWeather(user: User, params?: WeatherQueryParams): Promise<WeatherResponse> {
  const city = params?.city ?? user.location?.split(',')[0]?.trim();
  const query = { ...params, city };

  const farming = await getUserFarmingRecords(user.id);
  const fieldId = params?.fieldId;
  const fieldRecords = fieldId
    ? farming.filter((r) => r.fieldId === fieldId)
    : farming;

  const crops = [
    ...new Set([
      ...(fieldId ? [] : user.cropsPlanted ?? []),
      ...fieldRecords.map((r) => r.cropName),
    ]),
  ];

  if (env.openWeatherApiKey && (city || (params?.lat != null && params?.lon != null))) {
    try {
      const weather = await openWeatherGetCurrent(query);
      const locationLabel = fieldId && fieldRecords[0]?.fieldName
        ? `${fieldRecords[0].fieldName} · ${weather.location}`
        : user.location ?? weather.location;
      return {
        ...weather,
        location: locationLabel,
        plantingWindows: buildCropRecommendations(
          crops,
          weather.temperature,
          weather.humidity,
        ),
      };
    } catch {
      // fall through with notice below
    }
  }

  if (hasRestApi) {
    try {
      return await apiGetWeather(query);
    } catch {
      // fall through
    }
  }

  const cached = await weatherFromLastLog(user);
  if (cached) {
    return {
      ...cached,
      notice: env.openWeatherApiKey
        ? 'Live weather unavailable — showing your last saved reading.'
        : undefined,
    };
  }

  return {
    location: user.location ?? 'Set your location in Profile',
    temperature: 0,
    humidity: 0,
    condition: 'No data yet',
    icon: 'na',
    recommendation: 'Set your region in Profile, then pull down to refresh.',
    plantingWindows: [],
    notice: !user.location?.trim()
      ? 'Add your town or region in Profile to load weather.'
      : env.openWeatherApiKey
        ? `Could not find weather for "${city ?? user.location}". Try a nearby town name in Profile.`
        : 'Add EXPO_PUBLIC_OPENWEATHER_API_KEY for live forecasts.',
  };
}

export async function getPlantingRecommendations(
  user: User,
  params?: WeatherQueryParams,
): Promise<PlantingRecommendation[]> {
  const weather = await getWeather(user, params);
  return weather.plantingWindows ?? [];
}
