import type {
  ChatMessage,
  DiagnosisResult,
  PlantingEvent,
  User,
  WeatherData,
} from '../../types';

/** Standard API envelope from Verdora backend */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  code?: string;
}

// ——— Auth ———
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

// ——— Crop diagnosis ———
export interface DiagnoseCropRequest {
  imageUri: string;
}

export type DiagnoseCropResponse = DiagnosisResult;

// ——— Calendar ———
export type PlantingEventListResponse = PlantingEvent[];

export type CreatePlantingEventRequest = Omit<PlantingEvent, 'id'>;
export type UpdatePlantingEventRequest = Partial<CreatePlantingEventRequest>;

// ——— Weather ———
export interface WeatherQueryParams {
  lat?: number;
  lon?: number;
  city?: string;
}

export interface WeatherResponse extends WeatherData {
  plantingWindows?: PlantingRecommendation[];
}

export interface PlantingRecommendation {
  cropName: string;
  status: 'ideal' | 'caution' | 'avoid';
  reason: string;
}

// ——— Chat ———
export interface ChatRequest {
  message: string;
  history?: Pick<ChatMessage, 'role' | 'content'>[];
}

export interface ChatResponse {
  reply: ChatMessage;
}

// ——— Admin ———
export type AdminUsersResponse = User[];

export interface AdminExportResponse {
  filename: string;
  format: 'csv' | 'json';
  recordCount: number;
  generatedAt: string;
  downloadUrl?: string;
}
