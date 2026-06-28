import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRIVACY_STORAGE_KEY } from '../../constants/privacy';
import type {
  AdminDashboardInsights,
  ChatInsight,
  ChatQuestionRecord,
  CropScanRecord,
  DiseaseOutbreakInsight,
  EnvironmentLogRecord,
  FarmingDataRecord,
  LocationSegment,
  UserProfileRecord,
} from '../../types/analytics';
import type { DiagnosisResult, PlantingEvent, User, WeatherData } from '../../types';
import { generateId } from '../../utils/generateId';
import { getCloudAdminInsights } from '../supabase/analyticsRepository';
import { insertChatLog } from '../supabase/repositories/chatRepository';
import { upsertCrop, deleteCrop as deleteCloudCrop } from '../supabase/repositories/cropsRepository';
import { insertScan } from '../supabase/repositories/scansRepository';
import { upsertUser } from '../supabase/repositories/usersRepository';
import { insertWeatherLog } from '../supabase/repositories/weatherRepository';
import { buildRegionalIntelligence } from '../intelligence/aggregationEngine';
import { extractChatTopic } from '../intelligence/topicExtraction';

const ANALYTICS_DB_KEY = '@verdora_analytics_db';

/** Only collect when farmer has opted in */
async function canCollectForUser(user: User): Promise<boolean> {
  if (user.role === 'admin') return false;
  if (user.dataConsent === false) return false;
  const stored = await AsyncStorage.getItem(`${PRIVACY_STORAGE_KEY}_${user.id}`);
  if (stored === 'false') return false;
  if (user.dataConsent === true || stored === 'true') return true;
  return false;
}

interface AnalyticsDatabase {
  users: UserProfileRecord[];
  cropScans: CropScanRecord[];
  farmingRecords: FarmingDataRecord[];
  environmentLogs: EnvironmentLogRecord[];
  chatQuestions: ChatQuestionRecord[];
}

async function loadDb(): Promise<AnalyticsDatabase> {
  const raw = await AsyncStorage.getItem(ANALYTICS_DB_KEY);
  if (raw) return JSON.parse(raw) as AnalyticsDatabase;
  return {
    users: [],
    cropScans: [],
    farmingRecords: [],
    environmentLogs: [],
    chatQuestions: [],
  };
}

async function saveDb(db: AnalyticsDatabase): Promise<void> {
  await AsyncStorage.setItem(ANALYTICS_DB_KEY, JSON.stringify(db));
}

/** Raw local analytics store — used for full JSON export */
export async function loadFullAnalyticsDatabase(): Promise<AnalyticsDatabase> {
  return loadDb();
}

// ——— Track events (called from app features) ———

export async function trackUserProfile(user: User, dataConsent?: boolean): Promise<void> {
  if (user.role === 'admin') return;

  const consent = dataConsent ?? user.dataConsent ?? false;
  await upsertUser(user, consent);

  if (!(await canCollectForUser({ ...user, dataConsent: consent }))) return;

  const db = await loadDb();
  const record: UserProfileRecord = {
    ...user,
    dataConsent: consent,
    createdAt: user.createdAt ?? new Date().toISOString(),
  };
  const idx = db.users.findIndex((u) => u.id === user.id);
  if (idx >= 0) db.users[idx] = { ...db.users[idx], ...record };
  else db.users.push(record);
  await saveDb(db);
}

export async function trackCropScan(
  user: User,
  diagnosis: DiagnosisResult,
  field?: { fieldId?: string; fieldName?: string; latitude?: number; longitude?: number },
): Promise<void> {
  if (!(await canCollectForUser(user))) return;

  const enriched: DiagnosisResult = {
    ...diagnosis,
    fieldId: field?.fieldId ?? diagnosis.fieldId,
    fieldName: field?.fieldName ?? diagnosis.fieldName,
  };

  await insertScan(user, enriched, field);

  const db = await loadDb();
  db.cropScans.unshift({
    id: enriched.id,
    userId: user.id,
    userName: user.name,
    location: field?.fieldName ?? user.location ?? 'Unknown',
    latitude: field?.latitude ?? user.latitude,
    longitude: field?.longitude ?? user.longitude,
    imageUri: enriched.imageUri,
    cropType: enriched.cropName,
    disease: enriched.disease,
    confidence: enriched.confidence,
    treatment: enriched.treatment,
    timestamp: enriched.scannedAt,
    fieldId: enriched.fieldId,
    fieldName: enriched.fieldName,
  });
  await saveDb(db);
  await syncUserCrops(user.id, diagnosis.cropName);
}

async function syncUserCrops(userId: string, cropName: string): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return;
  const crops = new Set([...(user.cropsPlanted ?? []), cropName]);
  user.cropsPlanted = Array.from(crops);
  await saveDb(db);
}

export async function trackFarmingRecord(
  user: User,
  event: PlantingEvent,
  extras?: { soilType?: string; farmingMethods?: string[] },
): Promise<void> {
  if (!(await canCollectForUser(user))) return;

  await upsertCrop(user, event, extras);

  const db = await loadDb();
  const existing = db.farmingRecords.findIndex(
    (r) => r.userId === user.id && r.id === event.id,
  );
  const record: FarmingDataRecord = {
    id: event.id,
    userId: user.id,
    location: user.location ?? 'Unknown',
    cropName: event.cropName,
    plantDate: event.plantDate,
    harvestDate: event.harvestDate,
    soilType: extras?.soilType ?? user.soilType,
    farmingMethods: extras?.farmingMethods ?? user.farmingMethods,
    fieldName: event.fieldName,
    fieldId: event.fieldId,
    updatedAt: new Date().toISOString(),
  };
  if (existing >= 0) db.farmingRecords[existing] = record;
  else db.farmingRecords.push(record);
  await saveDb(db);
  await syncUserCrops(user.id, event.cropName);
}

export async function trackEnvironment(
  user: User,
  weather: WeatherData,
): Promise<void> {
  if (!(await canCollectForUser(user))) return;

  await insertWeatherLog(user, weather);

  const db = await loadDb();
  db.environmentLogs.unshift({
    id: generateId('env'),
    userId: user.id,
    location: weather.location,
    temperature: weather.temperature,
    humidity: weather.humidity,
    condition: weather.condition,
    timestamp: new Date().toISOString(),
  });
  // Keep last 200 logs
  db.environmentLogs = db.environmentLogs.slice(0, 200);
  await saveDb(db);
}

export async function trackChatQuestion(
  user: User,
  question: string,
  aiResponse?: string,
): Promise<void> {
  if (!(await canCollectForUser(user))) return;

  await insertChatLog(user, question, aiResponse);

  const db = await loadDb();
  db.chatQuestions.unshift({
    id: generateId('chat'),
    userId: user.id,
    location: user.location ?? 'Unknown',
    question: question.trim(),
    timestamp: new Date().toISOString(),
  });
  db.chatQuestions = db.chatQuestions.slice(0, 500);
  await saveDb(db);
}

export async function trackCropDeleted(user: User, eventId: string): Promise<void> {
  if (!(await canCollectForUser(user))) return;
  await deleteCloudCrop(eventId);
  const db = await loadDb();
  db.farmingRecords = db.farmingRecords.filter(
    (r) => !(r.userId === user.id && r.id === eventId),
  );
  await saveDb(db);
}

export async function getUserCropScans(userId: string): Promise<CropScanRecord[]> {
  const db = await loadDb();
  return db.cropScans.filter((s) => s.userId === userId);
}

export async function getUserFarmingRecords(userId: string): Promise<FarmingDataRecord[]> {
  const db = await loadDb();
  return db.farmingRecords.filter((r) => r.userId === userId);
}

export async function getUserChatQuestions(userId: string): Promise<ChatQuestionRecord[]> {
  const db = await loadDb();
  return db.chatQuestions.filter((q) => q.userId === userId);
}

export async function getUserEnvironmentLogs(userId: string): Promise<EnvironmentLogRecord[]> {
  const db = await loadDb();
  return db.environmentLogs.filter((e) => e.userId === userId);
}

export async function getLastEnvironmentLog(userId: string): Promise<EnvironmentLogRecord | null> {
  const db = await loadDb();
  return db.environmentLogs.find((e) => e.userId === userId) ?? null;
}

export async function updateFarmerProfile(
  userId: string,
  updates: Partial<
    Pick<
      User,
      | 'name'
      | 'soilType'
      | 'farmingMethods'
      | 'farmSize'
      | 'farmerType'
      | 'location'
      | 'regionId'
      | 'regionName'
      | 'townId'
      | 'townName'
      | 'constituency'
      | 'isCustomTown'
      | 'region'
      | 'village'
    >
  >,
): Promise<void> {
  const db = await loadDb();
  const user = db.users.find((u) => u.id === userId);
  if (user) {
    Object.assign(user, updates);
    await saveDb(db);
  }
}

// ——— Aggregation for admin ———

function aggregateDiseaseOutbreaks(scans: CropScanRecord[]): DiseaseOutbreakInsight[] {
  const map = new Map<string, DiseaseOutbreakInsight>();
  for (const scan of scans) {
    if (!scan.disease) continue;
    const key = scan.disease;
    const entry = map.get(key) ?? {
      disease: key,
      count: 0,
      locations: [],
      cropsAffected: [],
    };
    entry.count += 1;
    if (!entry.locations.includes(scan.location)) entry.locations.push(scan.location);
    if (!entry.cropsAffected.includes(scan.cropType)) entry.cropsAffected.push(scan.cropType);
    map.set(key, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function aggregateChatInsights(questions: ChatQuestionRecord[]): ChatInsight[] {
  const map = new Map<string, ChatInsight>();
  for (const q of questions) {
    const topic = extractChatTopic(q.question);
    const entry = map.get(topic) ?? {
      topic,
      questionCount: 0,
      sampleQuestion: q.question,
      locations: [],
    };
    entry.questionCount += 1;
    if (!entry.locations.includes(q.location)) entry.locations.push(q.location);
    map.set(topic, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.questionCount - a.questionCount);
}

function aggregateLocationSegments(users: UserProfileRecord[]): LocationSegment[] {
  const map = new Map<string, LocationSegment>();
  for (const user of users) {
    const loc = user.location ?? 'Unknown';
    const seg = map.get(loc) ?? { location: loc, userCount: 0, farmerTypes: {} };
    seg.userCount += 1;
    const ft = user.farmerType ?? 'unspecified';
    seg.farmerTypes[ft] = (seg.farmerTypes[ft] ?? 0) + 1;
    map.set(loc, seg);
  }
  return Array.from(map.values()).sort((a, b) => b.userCount - a.userCount);
}

export async function getAdminDashboardInsights(): Promise<AdminDashboardInsights> {
  try {
    const cloud = await getCloudAdminInsights();
    if (cloud && cloud.summary.totalUsers > 0) return cloud;
  } catch (e) {
    console.warn('[Verdora] Cloud analytics fallback to local:', e);
  }

  const db = await loadDb();
  const farmers = db.users.filter((u) => u.role === 'farmer');

  const byFarmerType: Record<string, number> = {};
  for (const f of farmers) {
    const key = f.farmerType ?? 'unspecified';
    byFarmerType[key] = (byFarmerType[key] ?? 0) + 1;
  }

  const envLogs = db.environmentLogs;
  const avgTemperature =
    envLogs.length > 0
      ? Math.round(envLogs.reduce((s, e) => s + e.temperature, 0) / envLogs.length)
      : 0;
  const avgHumidity =
    envLogs.length > 0
      ? Math.round(envLogs.reduce((s, e) => s + e.humidity, 0) / envLogs.length)
      : 0;

  const conditionMap = new Map<string, number>();
  for (const log of envLogs) {
    conditionMap.set(log.condition, (conditionMap.get(log.condition) ?? 0) + 1);
  }
  const topConditions = Array.from(conditionMap.entries())
    .map(([condition, count]) => ({ condition, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    summary: {
      totalUsers: db.users.length,
      totalFarmers: farmers.length,
      totalScans: db.cropScans.length,
      totalFarmingRecords: db.farmingRecords.length,
      totalChatQuestions: db.chatQuestions.length,
      totalEnvironmentLogs: envLogs.length,
    },
    users: db.users,
    segments: {
      byFarmerType,
      byLocation: aggregateLocationSegments(farmers),
    },
    farmingData: db.farmingRecords,
    cropScans: db.cropScans,
    diseaseOutbreaks: aggregateDiseaseOutbreaks(db.cropScans),
    environmentLogs: envLogs,
    environmentSummary: { avgTemperature, avgHumidity, topConditions },
    chatInsights: aggregateChatInsights(db.chatQuestions),
    regionalIntelligence: buildRegionalIntelligence({
      scans: db.cropScans,
      questions: db.chatQuestions,
      farming: db.farmingRecords,
      weatherLogs: envLogs,
    }),
  };
}

export async function setLocalUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
  const db = await loadDb();
  const idx = db.users.findIndex((u) => u.id === userId);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], isActive };
    await saveDb(db);
  }
}

export async function removeLocalUserAccount(userId: string): Promise<void> {
  const db = await loadDb();
  db.users = db.users.filter((u) => u.id !== userId);
  db.cropScans = db.cropScans.filter((r) => r.userId !== userId);
  db.farmingRecords = db.farmingRecords.filter((r) => r.userId !== userId);
  db.environmentLogs = db.environmentLogs.filter((r) => r.userId !== userId);
  db.chatQuestions = db.chatQuestions.filter((r) => r.userId !== userId);
  await saveDb(db);
}

/** Recompute dashboard insights from latest local + cloud data */
export async function regenerateAdminInsights(): Promise<AdminDashboardInsights> {
  return getAdminDashboardInsights();
}

