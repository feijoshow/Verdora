/** User roles supported by Verdora */
export type UserRole = 'farmer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  location?: string;
  cropsPlanted?: string[];
}

/** Crop diagnosis result from AI scanner */
export interface DiagnosisResult {
  id: string;
  cropName: string;
  disease: string | null;
  confidence: number;
  treatment: string;
  imageUri?: string;
  scannedAt: string;
}

/** Plantation calendar event — structured for future dataset integration */
export interface PlantingEvent {
  id: string;
  cropName: string;
  plantDate: string;
  harvestDate?: string;
  notes?: string;
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

/** Chat message for Gemini farming assistant */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
