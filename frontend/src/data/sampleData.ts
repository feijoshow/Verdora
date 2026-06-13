import type { DiagnosisResult, PlantingEvent, User, WeatherData } from '../types';

/** Demo users for mock authentication */
export const SAMPLE_USERS: User[] = [
  {
    id: '1',
    email: 'farmer@verdora.com',
    name: 'Maria Santos',
    role: 'farmer',
    location: 'Laguna, Philippines',
    latitude: 14.2691,
    longitude: 121.4113,
    cropsPlanted: ['Rice', 'Tomato', 'Eggplant'],
    farmSize: '2 hectares',
    farmerType: 'small-scale',
    soilType: 'Loamy',
    farmingMethods: ['Organic', 'Crop rotation'],
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: '2',
    email: 'admin@verdora.com',
    name: 'Admin User',
    role: 'admin',
    location: 'HQ',
    cropsPlanted: [],
  },
];

export const SAMPLE_PASSWORD = 'verdora123';

/** Pre-seeded diagnosis history for testing */
export const SAMPLE_DIAGNOSES: DiagnosisResult[] = [
  {
    id: 'd1',
    cropName: 'Tomato',
    disease: 'Early Blight',
    confidence: 0.87,
    treatment: 'Apply copper-based fungicide. Remove affected leaves. Improve air circulation.',
    scannedAt: '2026-05-10T09:30:00Z',
  },
  {
    id: 'd2',
    cropName: 'Rice',
    disease: null,
    confidence: 0.92,
    treatment: 'Crop appears healthy. Continue regular irrigation schedule.',
    scannedAt: '2026-05-12T14:15:00Z',
  },
];

/** Plantation calendar seed data */
export const SAMPLE_PLANTING_EVENTS: PlantingEvent[] = [
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

/** Mock weather response */
export const SAMPLE_WEATHER: WeatherData = {
  location: 'Laguna, Philippines',
  temperature: 29,
  humidity: 78,
  condition: 'Partly Cloudy',
  icon: 'partly-cloudy',
  recommendation: 'Good conditions for transplanting seedlings. Avoid heavy irrigation before expected rain.',
};
