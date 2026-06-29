export type { UserRole, FarmerType, User } from './user';
export type { FarmField } from './field';

export * from './analytics';
export * from './maintenance';

/** Crop diagnosis result from AI scanner */
export interface DiagnosisResult {
  id: string;
  cropName: string;
  disease: string | null;
  confidence: number;
  treatment: string;
  imageUri?: string;
  scannedAt: string;
  fieldId?: string;
  fieldName?: string;
  /** Farmer's note before scanning — guides the vision model and follow-up chat */
  scanPrompt?: string;
}

/** Context from a crop scan passed into follow-up chat */
export interface ScanChatContext {
  cropName: string;
  disease: string | null;
  confidence: number;
  treatment: string;
  scanPrompt?: string;
  fieldName?: string;
  scannedAt: string;
}

/** Plantation calendar event — structured for future dataset integration */
export interface PlantingEvent {
  id: string;
  cropName: string;
  plantDate: string;
  harvestDate?: string;
  notes?: string;
  fieldId?: string;
  fieldName?: string;
}

/** Weather snapshot */
export interface WeatherData {
  location: string;
  temperature: number;
  humidity: number;
  condition: string;
  icon: string;
  recommendation?: string;
}

/** Chat message for the farming assistant */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
