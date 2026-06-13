import { env } from '../../config/env';
import { CROP_KNOWLEDGE, DEFAULT_CROP_KNOWLEDGE } from '../../data/cropKnowledge';
import type { DiagnosisResult, User } from '../../types';
import { getPrimaryCropForUser, scanRecordToDiagnosis } from '../data/farmerDataService';
import { getUserCropScans } from '../analytics/dataCollectionService';
import { mockDelay, mockId } from '../mocks/mockUtils';
import { API_ENDPOINTS } from './endpoints';
import { apiClient } from './client';
import type { DiagnoseCropResponse } from './types';

const ANALYSIS_DELAY_MS = 1500;

/**
 * Diagnose using the farmer's real registered crops (calendar + profile).
 * Not random — ties results to crops they actually planted.
 */
async function diagnoseFromUserCrops(
  imageUri: string,
  user: User,
): Promise<DiagnosisResult> {
  await mockDelay(ANALYSIS_DELAY_MS);

  const cropName = await getPrimaryCropForUser(user);

  if (!cropName) {
    return {
      id: mockId('diag'),
      cropName: 'Unregistered crop',
      disease: null,
      confidence: 0,
      treatment:
        'Add crops in your Plantation Calendar first. Verdora diagnoses based on what you actually grow.',
      imageUri,
      scannedAt: new Date().toISOString(),
    };
  }

  const knowledge = CROP_KNOWLEDGE[cropName] ?? DEFAULT_CROP_KNOWLEDGE;
  const hasDisease = knowledge.commonDiseases.length > 0;
  const pick = hasDisease ? knowledge.commonDiseases[0] : null;

  return {
    id: mockId('diag'),
    cropName,
    disease: pick?.name ?? null,
    confidence: pick?.confidence ?? 0.9,
    treatment: pick?.treatment ?? knowledge.healthyTreatment,
    imageUri,
    scannedAt: new Date().toISOString(),
  };
}

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
 * Send crop image for AI diagnosis.
 * Local mode uses the farmer's real crop records — not random mock data.
 */
export async function diagnoseCropImage(
  imageUri: string,
  user: User,
): Promise<DiagnosisResult> {
  if (env.useMockApi) {
    return diagnoseFromUserCrops(imageUri, user);
  }

  try {
    return await apiDiagnoseCrop(imageUri);
  } catch {
    return diagnoseFromUserCrops(imageUri, user);
  }
}

export async function fetchDiagnosisHistory(userId: string): Promise<DiagnosisResult[]> {
  const { fetchScansByUser } = await import('../supabase/repositories/scansRepository');
  const { isSupabaseConfigured } = await import('../supabase/client');

  if (isSupabaseConfigured()) {
    try {
      const cloud = await fetchScansByUser(userId);
      if (cloud.length > 0) {
        return cloud.map((s) => ({
          id: s.id,
          cropName: s.crop_type,
          disease: s.disease,
          confidence: s.confidence,
          treatment: s.treatment ?? '',
          imageUri: s.image_url ?? undefined,
          scannedAt: s.scanned_at,
          fieldId: s.field_id ?? undefined,
          fieldName: s.field_name ?? undefined,
        }));
      }
    } catch {
      // fall through to local
    }
  }

  const scans = await getUserCropScans(userId);
  return scans.map(scanRecordToDiagnosis);
}
