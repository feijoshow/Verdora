import type { DiagnosisResult, PlantingEvent, User, WeatherData } from '../../types';
import type { PlantingRecommendation } from '../api/types';

export const MOCK_CROP_DIAGNOSES = [
  {
    cropName: 'Tomato',
    disease: 'Early Blight',
    confidence: 0.87,
    treatment:
      'Apply copper-based fungicide weekly. Remove infected lower leaves. Improve spacing for air flow.',
  },
  {
    cropName: 'Rice',
    disease: 'Bacterial Leaf Blight',
    confidence: 0.79,
    treatment:
      'Use resistant varieties next season. Avoid excessive nitrogen. Consider approved bactericides.',
  },
  {
    cropName: 'Corn',
    disease: null,
    confidence: 0.91,
    treatment: 'Crop appears healthy. Maintain consistent moisture and scout for pests weekly.',
  },
  {
    cropName: 'Eggplant',
    disease: 'Fruit Rot',
    confidence: 0.83,
    treatment:
      'Improve drainage. Avoid overhead irrigation. Remove rotting fruits and apply fungicide if needed.',
  },
  {
    cropName: 'Cassava',
    disease: 'Cassava Mosaic Disease',
    confidence: 0.76,
    treatment:
      'Uproot and destroy severely infected plants. Use virus-free cuttings from certified sources.',
  },
] as const;

export const MOCK_CHAT_REPLIES: Record<string, string> = {
  default:
    'Based on typical growing conditions, ensure well-drained soil, consistent watering, and regular pest scouting. Would you like advice on a specific crop?',
  rice: 'For rice, maintain 2–5 cm flood depth during vegetative stage. Watch for brown planthopper and blast disease after heavy rains.',
  tomato:
    'Tomatoes need full sun and staking. Water at the base to prevent leaf diseases. Apply calcium if you see blossom end rot.',
  weather:
    'Check forecasts before transplanting. Avoid planting seedlings 24–48 hours before heavy rain or strong winds.',
  fertilizer:
    'Split nitrogen applications for most cereals. Use soil tests when possible — over-fertilizing can increase pest pressure.',
};

export const MOCK_PLANTING_EVENTS: PlantingEvent[] = [
  {
    id: 'e1',
    cropName: 'Corn',
    plantDate: '2026-05-20',
    harvestDate: '2026-08-25',
    fieldName: 'North Field',
    notes: 'Hybrid variety — monitor for pests after 3 weeks',
  },
  {
    id: 'e2',
    cropName: 'Eggplant',
    plantDate: '2026-06-01',
    harvestDate: '2026-09-15',
    fieldName: 'Greenhouse B',
  },
];

export const MOCK_WEATHER: WeatherData = {
  location: 'Laguna, Philippines',
  temperature: 29,
  humidity: 78,
  condition: 'Partly Cloudy',
  icon: 'partly-cloudy',
  recommendation:
    'Good conditions for transplanting seedlings. Avoid heavy irrigation before expected rain.',
};

export const MOCK_PLANTING_RECOMMENDATIONS: PlantingRecommendation[] = [
  {
    cropName: 'Rice',
    status: 'ideal',
    reason: 'Warm temps and moderate humidity favor transplanting this week.',
  },
  {
    cropName: 'Tomato',
    status: 'caution',
    reason: 'High humidity may increase fungal risk — ensure good ventilation.',
  },
  {
    cropName: 'Corn',
    status: 'ideal',
    reason: 'Stable weather window for direct seeding in the next 5 days.',
  },
];

export const MOCK_ADMIN_USERS: User[] = [
  {
    id: '1',
    email: 'farmer@verdora.com',
    name: 'Maria Santos',
    role: 'farmer',
    location: 'Laguna, Philippines',
    cropsPlanted: ['Rice', 'Tomato', 'Eggplant'],
  },
  {
    id: '2',
    email: 'admin@verdora.com',
    name: 'Admin User',
    role: 'admin',
    location: 'HQ',
    cropsPlanted: [],
  },
  {
    id: '3',
    email: 'juan.delacruz@verdora.com',
    name: 'Juan Dela Cruz',
    role: 'farmer',
    location: 'Nueva Ecija, Philippines',
    cropsPlanted: ['Corn', 'Onion'],
  },
];

export function buildMockDiagnosis(imageUri: string): DiagnosisResult {
  const index = imageUri.length % MOCK_CROP_DIAGNOSES.length;
  const mock = MOCK_CROP_DIAGNOSES[index];
  return {
    id: `diag_${Date.now()}`,
    ...mock,
    imageUri,
    scannedAt: new Date().toISOString(),
  };
}
