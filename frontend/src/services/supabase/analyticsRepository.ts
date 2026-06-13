import type {
  AdminDashboardInsights,
  ChatInsight,
  CropScanRecord,
  DiseaseOutbreakInsight,
  EnvironmentLogRecord,
  FarmingDataRecord,
  LocationSegment,
  UserProfileRecord,
} from '../../types/analytics';
import type { DbChatLog, DbCrop, DbScan, DbUser, DbWeatherLog } from '../../types/database';
import { isSupabaseConfigured } from './client';
import { fetchAllChatLogs } from './repositories/chatRepository';
import { fetchAllCrops } from './repositories/cropsRepository';
import { fetchAllScans } from './repositories/scansRepository';
import { fetchAllUsers } from './repositories/usersRepository';
import { fetchAllWeatherLogs } from './repositories/weatherRepository';

function dbUserToProfile(u: DbUser): UserProfileRecord {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    location: u.location ?? undefined,
    latitude: u.latitude ?? undefined,
    longitude: u.longitude ?? undefined,
    farmSize: u.farm_size ?? undefined,
    farmerType: u.farmer_type ?? undefined,
    cropsPlanted: u.crop_preferences ?? [],
    cropPreferences: u.crop_preferences ?? [],
    soilType: u.soil_type ?? undefined,
    farmingMethods: u.farming_methods ?? [],
    dataConsent: u.data_consent,
    createdAt: u.created_at,
  };
}

function dbScanToRecord(s: DbScan, users: Map<string, DbUser>): CropScanRecord {
  const u = users.get(s.user_id);
  return {
    id: s.id,
    userId: s.user_id,
    userName: u?.name ?? 'Unknown',
    location: s.location ?? u?.location ?? 'Unknown',
    latitude: s.latitude ?? u?.latitude ?? undefined,
    longitude: s.longitude ?? u?.longitude ?? undefined,
    imageUri: s.image_url ?? undefined,
    cropType: s.crop_type,
    disease: s.disease,
    confidence: s.confidence,
    treatment: s.treatment ?? '',
    timestamp: s.scanned_at,
  };
}

function dbCropToFarming(c: DbCrop): FarmingDataRecord {
  return {
    id: c.id,
    userId: c.user_id,
    location: c.location ?? 'Unknown',
    cropName: c.crop_name,
    plantDate: c.plant_date,
    harvestDate: c.harvest_date ?? undefined,
    soilType: c.soil_type ?? undefined,
    farmingMethods: c.farming_methods ?? [],
    fieldName: c.field_name ?? undefined,
    updatedAt: c.updated_at,
  };
}

function dbWeatherToEnv(w: DbWeatherLog): EnvironmentLogRecord {
  return {
    id: w.id,
    userId: w.user_id,
    location: w.location,
    temperature: w.temperature,
    humidity: w.humidity,
    condition: w.condition,
    rainfallMm: w.rainfall_mm ?? undefined,
    timestamp: w.logged_at,
  };
}

function aggregateDiseaseOutbreaks(scans: CropScanRecord[]): DiseaseOutbreakInsight[] {
  const map = new Map<string, DiseaseOutbreakInsight>();
  for (const s of scans) {
    if (!s.disease) continue;
    const e = map.get(s.disease) ?? {
      disease: s.disease,
      count: 0,
      locations: [],
      cropsAffected: [],
    };
    e.count += 1;
    if (!e.locations.includes(s.location)) e.locations.push(s.location);
    if (!e.cropsAffected.includes(s.cropType)) e.cropsAffected.push(s.cropType);
    map.set(s.disease, e);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

import {
  buildRegionalIntelligence,
} from '../intelligence/aggregationEngine';
import { extractChatTopic } from '../intelligence/topicExtraction';

function aggregateChatInsights(logs: DbChatLog[]): ChatInsight[] {
  const map = new Map<string, ChatInsight>();
  for (const log of logs) {
    const topic = extractChatTopic(log.question);
    const e = map.get(topic) ?? {
      topic,
      questionCount: 0,
      sampleQuestion: log.question,
      locations: [],
    };
    e.questionCount += 1;
    const loc = log.location ?? 'Unknown';
    if (!e.locations.includes(loc)) e.locations.push(loc);
    map.set(topic, e);
  }
  return Array.from(map.values()).sort((a, b) => b.questionCount - a.questionCount);
}

function aggregateLocations(farmers: UserProfileRecord[]): LocationSegment[] {
  const map = new Map<string, LocationSegment>();
  for (const f of farmers) {
    const loc = f.location ?? 'Unknown';
    const seg = map.get(loc) ?? { location: loc, userCount: 0, farmerTypes: {} };
    seg.userCount += 1;
    const ft = f.farmerType ?? 'unspecified';
    seg.farmerTypes[ft] = (seg.farmerTypes[ft] ?? 0) + 1;
    map.set(loc, seg);
  }
  return Array.from(map.values()).sort((a, b) => b.userCount - a.userCount);
}

/** Build admin dashboard from Supabase cloud tables */
export async function getCloudAdminInsights(): Promise<AdminDashboardInsights | null> {
  if (!isSupabaseConfigured()) return null;

  const [usersResult, scansResult, cropsResult, weatherResult, chatResult] =
    await Promise.allSettled([
      fetchAllUsers(),
      fetchAllScans(),
      fetchAllCrops(),
      fetchAllWeatherLogs(),
      fetchAllChatLogs(),
    ]);

  const warn = (label: string, result: PromiseSettledResult<unknown>) => {
    if (result.status === 'rejected') {
      console.warn(`[Verdora] Cloud ${label} unavailable:`, result.reason);
    }
  };
  warn('users', usersResult);
  warn('scans', scansResult);
  warn('crops', cropsResult);
  warn('weather', weatherResult);
  warn('chat', chatResult);

  const users = usersResult.status === 'fulfilled' ? usersResult.value : [];
  const scans = scansResult.status === 'fulfilled' ? scansResult.value : [];
  const crops = cropsResult.status === 'fulfilled' ? cropsResult.value : [];
  const weatherLogs = weatherResult.status === 'fulfilled' ? weatherResult.value : [];
  const chatLogs = chatResult.status === 'fulfilled' ? chatResult.value : [];

  if (users.length === 0 && scans.length === 0 && crops.length === 0) {
    return null;
  }

  const userMap = new Map(users.map((u) => [u.id, u as DbUser]));
  const profiles = users.map((u) => dbUserToProfile(u as DbUser));
  const farmers = profiles.filter((u) => u.role === 'farmer');

  const cropScans = scans.map((s) => dbScanToRecord(s, userMap));
  const farmingData = crops.map(dbCropToFarming);
  const environmentLogs = weatherLogs.map(dbWeatherToEnv);

  const byFarmerType: Record<string, number> = {};
  for (const f of farmers) {
    const key = f.farmerType ?? 'unspecified';
    byFarmerType[key] = (byFarmerType[key] ?? 0) + 1;
  }

  const avgTemperature =
    environmentLogs.length > 0
      ? Math.round(
          environmentLogs.reduce((s, e) => s + e.temperature, 0) / environmentLogs.length,
        )
      : 0;
  const avgHumidity =
    environmentLogs.length > 0
      ? Math.round(
          environmentLogs.reduce((s, e) => s + e.humidity, 0) / environmentLogs.length,
        )
      : 0;

  const conditionMap = new Map<string, number>();
  for (const log of environmentLogs) {
    conditionMap.set(log.condition, (conditionMap.get(log.condition) ?? 0) + 1);
  }

  return {
    summary: {
      totalUsers: profiles.length,
      totalFarmers: farmers.length,
      totalScans: cropScans.length,
      totalFarmingRecords: farmingData.length,
      totalChatQuestions: chatLogs.length,
      totalEnvironmentLogs: environmentLogs.length,
    },
    users: profiles,
    segments: {
      byFarmerType,
      byLocation: aggregateLocations(farmers),
    },
    farmingData,
    cropScans,
    diseaseOutbreaks: aggregateDiseaseOutbreaks(cropScans),
    environmentLogs,
    environmentSummary: {
      avgTemperature,
      avgHumidity,
      topConditions: Array.from(conditionMap.entries())
        .map(([condition, count]) => ({ condition, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    },
    chatInsights: aggregateChatInsights(chatLogs),
    regionalIntelligence: buildRegionalIntelligence({
      scans: cropScans,
      questions: chatLogs.map((log) => ({
        id: log.id,
        userId: log.user_id,
        location: log.location ?? 'Unknown',
        question: log.question,
        timestamp: log.asked_at,
        aiResponse: log.ai_response ?? undefined,
      })),
      farming: farmingData,
      weatherLogs: environmentLogs,
    }),
  };
}
