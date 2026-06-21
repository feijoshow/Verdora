import { hasRestApi, env } from '../../config/env';
import type { User, WeatherData } from '../../types';
import { getUserLocationDisplay, getWeatherGeocodeQuery } from '../../utils/locationHelpers';
import { getLastEnvironmentLog, getUserFarmingRecords } from '../analytics/dataCollectionService';
import {
  buildSeasonalCropRecommendations,
  buildWeatherQueryVariants,
  drySeasonFarmingTip,
} from '../ai/namibiaWeather';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiGet, externalClient } from './client';
import type { PlantingRecommendation, WeatherQueryParams, WeatherResponse } from './types';

function mapOpenWeatherResponse(data: Record<string, unknown>, fallbackLocation?: string): WeatherData {
  const main = data.main as { temp?: number; humidity?: number } | undefined;
  const weather = (data.weather as { description?: string; icon?: string }[] | undefined)?.[0];
  const temp = main?.temp;
  const humidity = main?.humidity;

  return {
    location: (data.name as string | undefined) ?? fallbackLocation ?? 'Unknown',
    temperature: Math.round(temp ?? 0),
    humidity: humidity ?? 0,
    condition: weather?.description ?? 'Unknown',
    icon: weather?.icon ?? '01d',
    recommendation: drySeasonFarmingTip(temp ?? 0, humidity ?? 0),
  };
}

async function openWeatherGetCurrent(params: WeatherQueryParams): Promise<WeatherData> {
  const { openWeatherApiKey } = env;
  if (!openWeatherApiKey) throw new Error('EXPO_PUBLIC_OPENWEATHER_API_KEY is not set');

  if (params.lat != null && params.lon != null) {
    const { data } = await externalClient.get(EXTERNAL_APIS.openWeather, {
      params: { lat: params.lat, lon: params.lon, appid: openWeatherApiKey, units: 'metric' },
    });
    return mapOpenWeatherResponse(data, params.city);
  }

  if (!params.city?.trim()) {
    throw new Error('City or coordinates required for weather lookup');
  }

  const variants = buildWeatherQueryVariants(params.city);
  let lastError: unknown;

  for (const q of variants) {
    try {
      const { data } = await externalClient.get(EXTERNAL_APIS.openWeather, {
        params: { q, appid: openWeatherApiKey, units: 'metric' },
      });
      return mapOpenWeatherResponse(data, params.city);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(`Could not find weather for "${params.city}"`);
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
    recommendation: drySeasonFarmingTip(log.temperature, log.humidity),
    plantingWindows:
      crops.length > 0
        ? await buildSeasonalCropRecommendations(crops, log.temperature, log.humidity)
        : [],
  };
}

async function apiGetWeather(params?: WeatherQueryParams): Promise<WeatherResponse> {
  return apiGet<WeatherResponse>(API_ENDPOINTS.weather.current, { params });
}

export async function getWeather(user: User, params?: WeatherQueryParams): Promise<WeatherResponse> {
  const geocodeTown = getWeatherGeocodeQuery(user);
  const city = params?.city ?? geocodeTown;
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
        : getUserLocationDisplay(user) ?? weather.location;
      return {
        ...weather,
        location: locationLabel,
        plantingWindows: await buildSeasonalCropRecommendations(
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

  const displayLocation = getUserLocationDisplay(user);
  return {
    location: displayLocation ?? 'Set your location in Profile',
    temperature: 0,
    humidity: 0,
    condition: 'No data yet',
    icon: 'na',
    recommendation: 'Set your region in Profile, then pull down to refresh.',
    plantingWindows: [],
    notice: !displayLocation?.trim()
      ? 'Add your town or region in Profile to load weather.'
      : env.openWeatherApiKey
        ? `Could not find weather for "${city ?? geocodeTown ?? displayLocation}". Try a nearby town name in Profile.`
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
