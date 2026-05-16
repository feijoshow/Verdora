import { env } from '../../config/env';
import type { DiagnosisResult } from '../../types';
import { buildMockDiagnosis } from '../mocks/mockData';
import { mockDelay } from '../mocks/mockUtils';
import { API_ENDPOINTS } from './endpoints';
import { apiClient } from './client';
import type { DiagnoseCropResponse } from './types';

const MOCK_DELAY_MS = 1800;

// ——— Mock ———

async function mockDiagnoseCrop(imageUri: string): Promise<DiagnosisResult> {
  await mockDelay(MOCK_DELAY_MS);
  return buildMockDiagnosis(imageUri);
}

// ——— Real API ———

/**
 * POST /api/v1/crops/diagnose
 * Content-Type: multipart/form-data
 * Body: { image: File }
 */
async function apiDiagnoseCrop(imageUri: string): Promise<DiagnosisResult> {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() ?? 'crop.jpg';

  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);

  return apiClient
    .post<DiagnoseCropResponse>(API_ENDPOINTS.crops.diagnose, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((res) => res.data);
}

/**
 * Send crop image for AI disease diagnosis.
 * Uses mock when EXPO_PUBLIC_USE_MOCK_API=true (default).
 */
export async function diagnoseCropImage(imageUri: string): Promise<DiagnosisResult> {
  if (env.useMockApi) {
    return mockDiagnoseCrop(imageUri);
  }

  try {
    return await apiDiagnoseCrop(imageUri);
  } catch {
    // Fallback to mock if backend is unreachable during development
    return mockDiagnoseCrop(imageUri);
  }
}

/** Fetch user's diagnosis history from backend */
export async function fetchDiagnosisHistory(): Promise<DiagnosisResult[]> {
  if (env.useMockApi) return [];

  return apiClient
    .get<DiagnosisResult[]>(API_ENDPOINTS.crops.history)
    .then((res) => res.data);
}
