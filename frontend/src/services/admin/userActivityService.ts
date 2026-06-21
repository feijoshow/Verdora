import type {
  ChatQuestionRecord,
  CropScanRecord,
  EnvironmentLogRecord,
  FarmingDataRecord,
  UserActivityProfile,
  UserProfileRecord,
} from '../../types/analytics';
import type { DbChatLog, DbCrop, DbScan, DbUser, DbWeatherLog } from '../../types/database';
import {
  getUserChatQuestions,
  getUserCropScans,
  getUserEnvironmentLogs,
  getUserFarmingRecords,
  loadFullAnalyticsDatabase,
} from '../analytics/dataCollectionService';
import { isSupabaseConfigured } from '../supabase/client';
import { fetchChatLogsByUser } from '../supabase/repositories/chatRepository';
import { fetchCropsByUser } from '../supabase/repositories/cropsRepository';
import { fetchScansByUser } from '../supabase/repositories/scansRepository';
import { dbUserToUser, fetchAllUsers } from '../supabase/repositories/usersRepository';
import { fetchWeatherLogsByUser } from '../supabase/repositories/weatherRepository';

function dbScanToRecord(scan: DbScan, userName: string, location: string): CropScanRecord {
  return {
    id: scan.id,
    userId: scan.user_id,
    userName,
    location: scan.location ?? location,
    imageUri: scan.image_url ?? undefined,
    cropType: scan.crop_type,
    disease: scan.disease,
    confidence: scan.confidence,
    treatment: scan.treatment ?? '',
    timestamp: scan.scanned_at,
    fieldId: scan.field_id ?? undefined,
    fieldName: scan.field_name ?? undefined,
  };
}

function dbCropToRecord(crop: DbCrop, location: string): FarmingDataRecord {
  return {
    id: crop.id,
    userId: crop.user_id,
    location: crop.location ?? location,
    cropName: crop.crop_name,
    plantDate: crop.plant_date,
    harvestDate: crop.harvest_date ?? undefined,
    soilType: crop.soil_type ?? undefined,
    farmingMethods: crop.farming_methods ?? [],
    fieldName: crop.field_name ?? undefined,
    fieldId: crop.field_id ?? undefined,
    updatedAt: crop.updated_at,
  };
}

function dbWeatherToRecord(log: DbWeatherLog): EnvironmentLogRecord {
  return {
    id: log.id,
    userId: log.user_id,
    location: log.location,
    temperature: log.temperature,
    humidity: log.humidity,
    condition: log.condition,
    rainfallMm: log.rainfall_mm ?? undefined,
    timestamp: log.logged_at,
  };
}

function dbChatToRecord(log: DbChatLog, location: string): ChatQuestionRecord {
  return {
    id: log.id,
    userId: log.user_id,
    location: log.location ?? location,
    question: log.question,
    aiResponse: log.ai_response ?? undefined,
    timestamp: log.asked_at,
  };
}

function dbUserToProfile(user: DbUser): UserProfileRecord {
  return dbUserToUser(user) as UserProfileRecord;
}

function mergeById<T extends { id: string }>(primary: T[], secondary: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of [...secondary, ...primary]) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

/** Load everything a consented farmer has done — local store + Supabase when available */
export async function getUserActivityProfile(userId: string): Promise<UserActivityProfile | null> {
  const db = await loadFullAnalyticsDatabase();
  let localUser = db.users.find((u) => u.id === userId);

  if (!localUser && isSupabaseConfigured()) {
    try {
      const cloudUsers = await fetchAllUsers();
      const match = cloudUsers.find((u) => u.id === userId);
      if (match) localUser = dbUserToProfile(match);
    } catch {
      // fall through
    }
  }

  if (!localUser) return null;

  const location = localUser.location ?? 'Unknown';

  const [localScans, localFarming, localChat, localEnv] = await Promise.all([
    getUserCropScans(userId),
    getUserFarmingRecords(userId),
    getUserChatQuestions(userId),
    getUserEnvironmentLogs(userId),
  ]);

  let scans = localScans;
  let farmingRecords = localFarming;
  let chatQuestions = localChat;
  let environmentLogs = localEnv;
  const user: UserProfileRecord = localUser;

  if (isSupabaseConfigured()) {
    const [cloudScans, cloudCrops, cloudChat, cloudWeather] = await Promise.allSettled([
      fetchScansByUser(userId),
      fetchCropsByUser(userId),
      fetchChatLogsByUser(userId),
      fetchWeatherLogsByUser(userId),
    ]);

    if (cloudScans.status === 'fulfilled') {
      const cloud = cloudScans.value.map((s) => dbScanToRecord(s, user.name, location));
      scans = mergeById(cloud, localScans);
    }
    if (cloudCrops.status === 'fulfilled') {
      const cloud = cloudCrops.value.map((c) => dbCropToRecord(c, location));
      farmingRecords = mergeById(cloud, localFarming);
    }
    if (cloudChat.status === 'fulfilled') {
      const cloud = cloudChat.value.map((c) => dbChatToRecord(c, location));
      chatQuestions = mergeById(cloud, localChat);
    }
    if (cloudWeather.status === 'fulfilled') {
      const cloud = cloudWeather.value.map(dbWeatherToRecord);
      environmentLogs = mergeById(cloud, localEnv);
    }
  }

  return {
    user,
    scans,
    farmingRecords,
    environmentLogs,
    chatQuestions,
    stats: {
      scanCount: scans.length,
      farmingCount: farmingRecords.length,
      chatCount: chatQuestions.length,
      environmentCount: environmentLogs.length,
    },
  };
}
