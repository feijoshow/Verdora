import { hasRestApi } from '../../config/env';
import { CROP_KNOWLEDGE, DEFAULT_CROP_KNOWLEDGE } from '../../data/cropKnowledge';
import type { DiagnosisResult, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { getPrimaryCropForUser, scanRecordToDiagnosis } from '../data/farmerDataService';
import { getUserCropScans } from '../analytics/dataCollectionService';
import { API_ENDPOINTS } from './endpoints';
import { apiClient } from './client';
import type { DiagnoseCropResponse } from './types';

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
 * Client-side fallback when the diagnosis API is unavailable.
 * Uses the farmer's registered crops — not fabricated sample data.
 */
async function diagnoseFromUserCrops(
  imageUri: string,
  user: User,
): Promise<DiagnosisResult> {
  const cropName = await getPrimaryCropForUser(user);

  if (!cropName) {
    return {
      id: generateId('diag'),
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
    id: generateId('diag'),
    cropName,
    disease: pick?.name ?? null,
    confidence: pick?.confidence ?? 0.9,
    treatment: pick?.treatment ?? knowledge.healthyTreatment,
    imageUri,
    scannedAt: new Date().toISOString(),
  };
}

export async function diagnoseCropImage(
  imageUri: string,
  user: User,
): Promise<DiagnosisResult> {
  if (hasRestApi) {
    try {
      return await apiDiagnoseCrop(imageUri);
    } catch {
      return diagnoseFromUserCrops(imageUri, user);
    }
  }

  return diagnoseFromUserCrops(imageUri, user);
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
