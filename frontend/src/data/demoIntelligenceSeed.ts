import type { ChatQuestionRecord, CropScanRecord, FarmingDataRecord, EnvironmentLogRecord } from '../types/analytics';
import { loadFullAnalyticsDatabase } from '../services/analytics/dataCollectionService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEED_KEY = '@verdora_intelligence_demo_seeded';

/** Pre-seed geo-tagged demo data so intelligence features are visible in mock mode */
export async function ensureDemoIntelligenceSeed(): Promise<void> {
  const seeded = await AsyncStorage.getItem(SEED_KEY);
  if (seeded === 'true') return;

  const db = await loadFullAnalyticsDatabase();
  const diseasedScans = db.cropScans.filter((s) => s.disease);
  if (diseasedScans.length >= 3) {
    await AsyncStorage.setItem(SEED_KEY, 'true');
    return;
  }

  const now = Date.now();
  const baseLat = 14.2691;
  const baseLng = 121.4113;
  const location = 'Laguna, Philippines';

  const demoScans: CropScanRecord[] = [
    {
      id: 'demo-scan-1',
      userId: 'demo-farmer-2',
      userName: 'Juan Reyes',
      location,
      latitude: baseLat + 0.01,
      longitude: baseLng + 0.02,
      cropType: 'Tomato',
      disease: 'Early Blight',
      confidence: 0.86,
      treatment: 'Apply copper fungicide.',
      timestamp: new Date(now - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-scan-2',
      userId: 'demo-farmer-3',
      userName: 'Ana Cruz',
      location,
      latitude: baseLat - 0.015,
      longitude: baseLng + 0.01,
      cropType: 'Tomato',
      disease: 'Early Blight',
      confidence: 0.91,
      treatment: 'Remove affected leaves.',
      timestamp: new Date(now - 1 * 86400000).toISOString(),
    },
    {
      id: 'demo-scan-3',
      userId: 'demo-farmer-4',
      userName: 'Pedro Lim',
      location,
      latitude: baseLat + 0.005,
      longitude: baseLng - 0.018,
      cropType: 'Tomato',
      disease: 'Early Blight',
      confidence: 0.88,
      treatment: 'Improve air circulation.',
      timestamp: new Date(now - 12 * 3600000).toISOString(),
    },
    {
      id: 'demo-scan-4',
      userId: 'demo-farmer-5',
      userName: 'Liza Tan',
      location,
      latitude: baseLat - 0.008,
      longitude: baseLng - 0.005,
      cropType: 'Eggplant',
      disease: 'Fruit Rot',
      confidence: 0.79,
      treatment: 'Improve drainage.',
      timestamp: new Date(now - 6 * 3600000).toISOString(),
    },
  ];

  const demoQuestions: ChatQuestionRecord[] = [
    {
      id: 'demo-chat-1',
      userId: 'demo-farmer-2',
      location: 'Ashanti, Ghana',
      question: 'When should I apply nitrogen fertilizer to my maize?',
      timestamp: new Date(now - 86400000).toISOString(),
    },
    {
      id: 'demo-chat-2',
      userId: 'demo-farmer-3',
      location: 'Ashanti, Ghana',
      question: 'How much nitrogen does maize need at flowering stage?',
      timestamp: new Date(now - 43200000).toISOString(),
    },
    {
      id: 'demo-chat-3',
      userId: 'demo-farmer-4',
      location: 'Kumasi, Ghana',
      question: 'Best time to apply NPK on maize in Ashanti region?',
      timestamp: new Date(now - 21600000).toISOString(),
    },
    {
      id: 'demo-chat-4',
      userId: 'demo-farmer-5',
      location: 'Ashanti, Ghana',
      question: 'My maize leaves are yellow — is it nitrogen deficiency?',
      timestamp: new Date(now - 10800000).toISOString(),
    },
  ];

  const demoFarming: FarmingDataRecord[] = [
    {
      id: 'demo-crop-1',
      userId: 'demo-farmer-2',
      location: 'Laguna, Philippines',
      cropName: 'Corn',
      plantDate: '2026-05-20',
      harvestDate: '2026-08-25',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-crop-2',
      userId: 'demo-farmer-3',
      location: 'Laguna, Philippines',
      cropName: 'Rice',
      plantDate: '2026-06-01',
      harvestDate: '2026-09-15',
      updatedAt: new Date().toISOString(),
    },
  ];

  const demoWeather: EnvironmentLogRecord[] = [
    {
      id: 'demo-weather-1',
      userId: 'demo-farmer-2',
      location: 'Laguna, Philippines',
      temperature: 29,
      humidity: 78,
      condition: 'Partly Cloudy',
      timestamp: new Date().toISOString(),
    },
  ];

  const ANALYTICS_DB_KEY = '@verdora_analytics_db';
  const merged = {
    ...db,
    cropScans: [...demoScans, ...db.cropScans],
    chatQuestions: [...demoQuestions, ...db.chatQuestions],
    farmingRecords: [...demoFarming, ...db.farmingRecords],
    environmentLogs: [...demoWeather, ...db.environmentLogs],
  };
  await AsyncStorage.setItem(ANALYTICS_DB_KEY, JSON.stringify(merged));
  await AsyncStorage.setItem(SEED_KEY, 'true');
}
