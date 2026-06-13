import type { User } from './user';

/** Crop scan record for admin analytics & outbreak tracking */
export interface CropScanRecord {
  id: string;
  userId: string;
  userName: string;
  location: string;
  latitude?: number;
  longitude?: number;
  imageUri?: string;
  cropType: string;
  disease: string | null;
  confidence: number;
  treatment: string;
  timestamp: string;
  fieldId?: string;
  fieldName?: string;
}

/** Farming activity from calendar & profile */
export interface FarmingDataRecord {
  id: string;
  userId: string;
  location: string;
  cropName: string;
  plantDate: string;
  harvestDate?: string;
  soilType?: string;
  farmingMethods?: string[];
  fieldId?: string;
  fieldName?: string;
  updatedAt: string;
}

/** Weather snapshot logged per user session */
export interface EnvironmentLogRecord {
  id: string;
  userId: string;
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  rainfallMm?: number;
  timestamp: string;
}

/** Farmer question from chatbot — market signal data */
export interface ChatQuestionRecord {
  id: string;
  userId: string;
  location: string;
  question: string;
  timestamp: string;
  aiResponse?: string;
}

/** Full activity profile for a single consented farmer (admin view) */
export interface UserActivityProfile {
  user: UserProfileRecord;
  scans: CropScanRecord[];
  farmingRecords: FarmingDataRecord[];
  environmentLogs: EnvironmentLogRecord[];
  chatQuestions: ChatQuestionRecord[];
  stats: {
    scanCount: number;
    farmingCount: number;
    chatCount: number;
    environmentCount: number;
  };
}

/** Extended user profile for segmentation */
export interface UserProfileRecord extends User {
  createdAt: string;
  dataConsent?: boolean;
}

export interface DiseaseOutbreakInsight {
  disease: string;
  count: number;
  locations: string[];
  cropsAffected: string[];
}

export interface ChatInsight {
  topic: string;
  questionCount: number;
  sampleQuestion: string;
  locations: string[];
}

/** Geospatial disease outbreak alert — privacy-safe aggregate */
export interface DiseaseAlert {
  id: string;
  disease: string;
  cropTypes: string[];
  scanCount: number;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  regionLabel?: string;
  active: boolean;
  detectedAt: string;
  expiresAt?: string;
}

/** Regional knowledge gap for NGOs / extension services */
export interface KnowledgeGapReport {
  id: string;
  topic: string;
  region: string;
  questionCount: number;
  sampleQuestion: string;
  priority: 'low' | 'medium' | 'high';
  locations: string[];
  reportDate: string;
}

/** Planting window insight from calendar + weather aggregation */
export interface PlantingWindowInsight {
  id: string;
  cropName: string;
  region: string;
  optimalMonths: string[];
  observedPlantMonths: string[];
  farmerCount: number;
  avgTemperature?: number;
  avgHumidity?: number;
  recommendation: string;
  reportDate: string;
}

/** Actionable regional intelligence payload */
export interface RegionalIntelligence {
  diseaseAlerts: DiseaseAlert[];
  knowledgeGaps: KnowledgeGapReport[];
  plantingInsights: PlantingWindowInsight[];
  lastAggregatedAt?: string;
}

export interface LocationSegment {
  location: string;
  userCount: number;
  farmerTypes: Record<string, number>;
}

/** Aggregated admin dashboard payload */
export interface AdminDashboardInsights {
  summary: {
    totalUsers: number;
    totalFarmers: number;
    totalScans: number;
    totalFarmingRecords: number;
    totalChatQuestions: number;
    totalEnvironmentLogs: number;
  };
  users: UserProfileRecord[];
  segments: {
    byFarmerType: Record<string, number>;
    byLocation: LocationSegment[];
  };
  farmingData: FarmingDataRecord[];
  cropScans: CropScanRecord[];
  diseaseOutbreaks: DiseaseOutbreakInsight[];
  environmentLogs: EnvironmentLogRecord[];
  environmentSummary: {
    avgTemperature: number;
    avgHumidity: number;
    topConditions: { condition: string; count: number }[];
  };
  chatInsights: ChatInsight[];
  regionalIntelligence: RegionalIntelligence;
}
