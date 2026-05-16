import { env } from '../../config/env';
import type { WeatherData } from '../../types';
import {
  MOCK_PLANTING_RECOMMENDATIONS,
  MOCK_WEATHER,
} from '../mocks/mockData';
import { mockDelay } from '../mocks/mockUtils';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiGet, externalClient } from './client';
import type { PlantingRecommendation, WeatherQueryParams, WeatherResponse } from './types';

// ——— Mock ———

async function mockGetWeather(_params?: WeatherQueryParams): Promise<WeatherResponse> {
  await mockDelay(700);
  return {
    ...MOCK_WEATHER,
    plantingWindows: MOCK_PLANTING_RECOMMENDATIONS,
  };
}

// ——— OpenWeatherMap (direct) ———

async function openWeatherGetCurrent(params: WeatherQueryParams): Promise<WeatherData> {
  const { openWeatherApiKey } = env;
  if (!openWeatherApiKey) {
    throw new Error('EXPO_PUBLIC_OPENWEATHER_API_KEY is not set');
  }

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

function derivePlantingRecommendation(temp?: number, humidity?: number): string {
  if (temp == null || humidity == null) return MOCK_WEATHER.recommendation ?? '';
  if (temp >= 28 && humidity > 75) {
    return 'High humidity — delay spraying; good for rice transplanting if fields are prepared.';
  }
  if (temp >= 20 && temp <= 30 && humidity < 70) {
    return 'Favorable conditions for transplanting vegetables and direct-seeding corn.';
  }
  return 'Monitor forecast daily; protect seedlings from midday heat stress.';
}

// ——— Verdora backend ———

async function apiGetWeather(params?: WeatherQueryParams): Promise<WeatherResponse> {
  return apiGet<WeatherResponse>(API_ENDPOINTS.weather.current, { params });
}

async function apiGetPlantingRecommendations(
  params?: WeatherQueryParams,
): Promise<PlantingRecommendation[]> {
  return apiGet<PlantingRecommendation[]>(API_ENDPOINTS.weather.plantingRecommendations, {
    params,
  });
}

// ——— Public API ———

/**
 * Current weather + planting recommendations.
 * Priority: mock → OpenWeather (if key set) → Verdora API → mock fallback.
 */
export async function getWeather(params?: WeatherQueryParams): Promise<WeatherResponse> {
  if (env.useMockApi) {
    return mockGetWeather(params);
  }

  if (env.openWeatherApiKey && (params?.city || (params?.lat && params?.lon))) {
    try {
      const weather = await openWeatherGetCurrent(params);
      const plantingWindows = await apiGetPlantingRecommendations(params).catch(
        () => MOCK_PLANTING_RECOMMENDATIONS,
      );
      return { ...weather, plantingWindows };
    } catch {
      // fall through to backend or mock
    }
  }

  try {
    return await apiGetWeather(params);
  } catch {
    return mockGetWeather(params);
  }
}

export async function getPlantingRecommendations(
  params?: WeatherQueryParams,
): Promise<PlantingRecommendation[]> {
  if (env.useMockApi) {
    await mockDelay(400);
    return MOCK_PLANTING_RECOMMENDATIONS;
  }

  try {
    return await apiGetPlantingRecommendations(params);
  } catch {
    return MOCK_PLANTING_RECOMMENDATIONS;
  }
}
