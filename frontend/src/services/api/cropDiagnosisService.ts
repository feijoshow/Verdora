import { env, hasRestApi } from '../../config/env';
import { CROP_KNOWLEDGE, DEFAULT_CROP_KNOWLEDGE } from '../../data/cropKnowledge';
import { CROP_GUIDE_NAMES } from '../../data/cropPlantingGuide';
import type { DiagnosisResult, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { mimeTypeFromUri, readImageAsBase64 } from '../../utils/readImageBase64';
import { getPrimaryCropForUser, scanRecordToDiagnosis } from '../data/farmerDataService';
import { getUserCropScans } from '../analytics/dataCollectionService';
import { API_ENDPOINTS, EXTERNAL_APIS } from './endpoints';
import { apiClient, externalClient } from './client';
import { toApiError } from './errors';
import type { DiagnoseCropResponse, DiagnosisOutcome } from './types';

const KNOWN_CROP_NAMES = [...new Set([...Object.keys(CROP_KNOWLEDGE), ...CROP_GUIDE_NAMES])]
  .slice(0, 24)
  .join(', ');

interface GeminiDiagnosisPayload {
  cropName?: string;
  disease?: string | null;
  confidence?: number;
  treatment?: string;
}

function parseGeminiDiagnosis(raw: string): GeminiDiagnosisPayload | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as GeminiDiagnosisPayload;
  } catch {
    return null;
  }
}

function buildGeminiScanPrompt(user: User): string {
  const crops = user.cropsPlanted?.join(', ') ?? 'unknown';
  return (
    `You are Verdora crop disease analyst for Namibian farmers (Gemini vision). ` +
    `Farmer location: ${user.location ?? 'Namibia'}. Registered crops: ${crops}. ` +
    `Prefer crop names from this list when possible: ${KNOWN_CROP_NAMES}. ` +
    `If the image is not a crop, or is too blurry to tell, set confidence below 0.4 and explain in treatment. ` +
    `Treatment advice should favor locally available, low-cost options when possible. ` +
    `Respond ONLY with valid JSON (no markdown): ` +
    `{"cropName":"string","disease":"string or null if healthy","confidence":0.0,"treatment":"actionable advice"}`
  );
}

async function geminiDiagnoseCrop(imageUri: string, user: User): Promise<DiagnosisOutcome> {
  const { geminiApiKey } = env;
  if (!geminiApiKey) throw new Error('EXPO_PUBLIC_GEMINI_API_KEY is not set');

  const base64 = await readImageAsBase64(imageUri);
  const mimeType = mimeTypeFromUri(imageUri);

  const { data } = await externalClient.post(
    `${EXTERNAL_APIS.geminiVision}?key=${geminiApiKey}`,
    {
      contents: [
        {
          parts: [
            { text: buildGeminiScanPrompt(user) },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    },
    { headers: { 'Content-Type': 'application/json' }, timeout: 60000 },
  );

  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = parseGeminiDiagnosis(rawText);
  const fallbackCrop = (await getPrimaryCropForUser(user)) ?? 'Unknown crop';

  if (!parsed) {
    return {
      result: {
        id: generateId('diag'),
        cropName: fallbackCrop,
        disease: null,
        confidence: 0,
        treatment:
          'Could not get a confident read — try a closer photo of the affected leaf in better light.',
        imageUri,
        scannedAt: new Date().toISOString(),
      },
      notice: 'Analysis was inconclusive. Try again with a clearer crop photo.',
    };
  }

  const confidence = Math.min(1, Math.max(0, parsed.confidence ?? 0));
  const lowConfidence = confidence < 0.45;

  return {
    result: {
      id: generateId('diag'),
      cropName: parsed.cropName?.trim() || fallbackCrop,
      disease: parsed.disease ?? null,
      confidence,
      treatment:
        parsed.treatment?.trim() ||
        (lowConfidence
          ? 'Try a closer photo in better light for a more accurate diagnosis.'
          : 'Monitor the plant and scan again in a few days if symptoms persist.'),
      imageUri,
      scannedAt: new Date().toISOString(),
    },
    notice: lowConfidence
      ? 'Low confidence read — treat this as a guide, not a definitive diagnosis.'
      : undefined,
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

async function diagnoseFromUserCrops(
  imageUri: string,
  user: User,
): Promise<DiagnosisOutcome> {
  const cropName = await getPrimaryCropForUser(user);

  if (!cropName) {
    return {
      result: {
        id: generateId('diag'),
        cropName: 'Unregistered crop',
        disease: null,
        confidence: 0,
        treatment:
          'Add crops in your Plantation Calendar first. Verdora diagnoses based on what you actually grow.',
        imageUri,
        scannedAt: new Date().toISOString(),
      },
      notice: 'Add a crop in Calendar before scanning for best results.',
    };
  }

  const knowledge = CROP_KNOWLEDGE[cropName] ?? DEFAULT_CROP_KNOWLEDGE;
  const hasDisease = knowledge.commonDiseases.length > 0;
  const pick = hasDisease ? knowledge.commonDiseases[0] : null;

  return {
    result: {
      id: generateId('diag'),
      cropName,
      disease: pick?.name ?? null,
      confidence: pick?.confidence ?? 0.9,
      treatment: pick?.treatment ?? knowledge.healthyTreatment,
      imageUri,
      scannedAt: new Date().toISOString(),
    },
    notice: env.geminiApiKey
      ? 'Could not reach Gemini — showing guidance based on your registered crops.'
      : undefined,
  };
}

export async function diagnoseCropImage(
  imageUri: string,
  user: User,
): Promise<DiagnosisOutcome> {
  let lastError: unknown;

  if (env.geminiApiKey) {
    try {
      return await geminiDiagnoseCrop(imageUri, user);
    } catch (error) {
      lastError = error;
    }
  }

  if (hasRestApi) {
    try {
      const result = await apiDiagnoseCrop(imageUri);
      return { result };
    } catch (error) {
      lastError = error;
    }
  }

  const fallback = await diagnoseFromUserCrops(imageUri, user);
  if (lastError) {
    const msg = toApiError(lastError).message;
    return {
      ...fallback,
      notice:
        msg.includes('network') || msg.includes('timeout')
          ? 'No connection — showing offline guidance from your crop list.'
          : `Scan service unavailable: ${msg}`,
    };
  }
  return fallback;
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
      // fall through to local — history still loads from device
    }
  }

  const scans = await getUserCropScans(userId);
  return scans.map(scanRecordToDiagnosis);
}
