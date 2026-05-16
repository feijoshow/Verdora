/**
 * Verdora API layer — single import point for all services.
 *
 * @example
 * import { diagnoseCropImage, getWeather, sendChatMessage } from '@/services/api';
 */

// Client & infrastructure
export { apiClient, externalClient, apiGet, apiPost, apiPut, apiDelete } from './client';
export { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
export { ApiError, isApiError, toApiError } from './errors';
export { tokenStorage } from './tokenStorage';
export type * from './types';

// Domain services
export { login, register, logout, getCurrentUser } from './authService';
export { diagnoseCropImage, fetchDiagnosisHistory } from './cropDiagnosisService';
export { getWeather, getPlantingRecommendations } from './weatherService';
export { sendChatMessage } from './chatService';
export {
  listPlantingEvents,
  createPlantingEvent,
  updatePlantingEvent,
  deletePlantingEvent,
  importCalendarDataset,
} from './plantationCalendarService';
export { listUsers, getUserById, exportUserReport } from './adminService';
