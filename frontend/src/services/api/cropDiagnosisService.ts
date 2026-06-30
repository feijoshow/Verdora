import { getChatLocationLabel } from '../../utils/locationHelpers';
import { env, hasAiApi } from '../../config/env';
import type { DiagnosisResult, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { readImageForVision } from '../../utils/readImageBase64';
import { scanRecordToDiagnosis } from '../data/farmerDataService';
import { getUserCropScans } from '../analytics/dataCollectionService';
import {
  buildTreatmentText,
  buildVisionScanPrompt,
  normalizeConfidence,
  resolveVisionCropName,
  shouldRejectAsNonCrop,
  type VisionDiagnosisPayload,
} from '../ai/scanPrompts';
import { API_ENDPOINTS, ZAI_VISION_MODEL, ZAI_CHAT_COMPLETIONS_URL } from './endpoints';
import { aiApiPost, externalClient } from './client';
import { toApiError } from './errors';
import type { DiagnoseCropResponse, DiagnosisOutcome } from './types';

interface ZaiChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: string };
}

function scanErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const msg = apiError.message.toLowerCase();
  const status = apiError.status;

  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'Scanner is busy (Z.ai rate limit). Wait 30 seconds and try again.';
  }
  if (status === 403 || msg.includes('403') || msg.includes('permission') || msg.includes('invalid api key')) {
    return 'Scanner could not authenticate. Contact the Verdora team.';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('failed to fetch')) {
    return hasAiApi
      ? 'No connection to the scan service. Check your internet and try again.'
      : 'No connection — check your network and try again.';
  }
  if (msg.includes('zai_api_key') || msg.includes('not configured on the api')) {
    return 'Scan service is unavailable. Try again later or contact the Verdora team.';
  }
  if (msg.includes('not valid json') || msg.includes('empty response') || msg.includes('unparseable')) {
    return "Couldn't read the scan result — try a clearer photo of the affected leaf or fruit.";
  }
  if (msg.includes('could not be read')) {
    return 'Image could not be read. Re-upload the photo or try capturing again.';
  }
  if (msg.includes('not configured')) {
    return 'Crop scanner is not configured. Set EXPO_PUBLIC_AI_API_URL or EXPO_PUBLIC_ZAI_API_KEY.';
  }
  return apiError.message;
}

function parseVisionDiagnosis(raw: string): VisionDiagnosisPayload | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as VisionDiagnosisPayload;
  } catch {
    return null;
  }
}

function extractZaiResponseText(data: ZaiChatCompletionResponse): string {
  if (data?.error?.message) {
    throw new Error(data.error.message);
  }

  const rawText = data?.choices?.[0]?.message?.content?.trim() ?? '';
  if (!rawText) {
    throw new Error('Vision model returned an empty response');
  }

  return rawText;
}

function buildDiagnosisFromVision(
  parsed: VisionDiagnosisPayload,
  imageUri: string,
): DiagnosisOutcome {
  const confidence = normalizeConfidence(parsed.confidence);
  const lowConfidence = confidence < 0.5;
  const reject = shouldRejectAsNonCrop(parsed, confidence);

  if (reject) {
    return {
      result: {
        id: generateId('diag'),
        cropName: 'Not a crop',
        disease: null,
        confidence,
        treatment:
          parsed.treatment?.trim() ||
          'Frame a clear photo of the plant leaf, fruit, or stem in good light — not soil, tools, or people.',
        imageUri,
        scannedAt: new Date().toISOString(),
      },
      notice: 'No plant detected — point the camera at the affected crop.',
    };
  }

  const cropName = resolveVisionCropName(parsed);
  const disease = parsed.disease?.trim() || null;

  return {
    result: {
      id: generateId('diag'),
      cropName,
      disease,
      confidence,
      treatment: buildTreatmentText(parsed, lowConfidence),
      imageUri,
      scannedAt: new Date().toISOString(),
    },
    notice: lowConfidence
      ? 'Partial match — try a closer photo of the spots or damaged area for a sharper diagnosis.'
      : undefined,
  };
}

function diagnosisFromApiResponse(result: DiagnoseCropResponse, imageUri: string): DiagnosisOutcome {
  return buildDiagnosisFromVision(
    {
      cropName: result.cropName,
      disease: result.disease,
      confidence: result.confidence,
      treatment: result.treatment,
    },
    imageUri,
  );
}

async function requestZaiVisionDirect(
  mimeType: string,
  base64: string,
  prompt: string,
): Promise<ZaiChatCompletionResponse> {
  const { zaiApiKey } = env;
  if (!zaiApiKey) throw new Error('EXPO_PUBLIC_ZAI_API_KEY is not set');

  const { data } = await externalClient.post<ZaiChatCompletionResponse>(
    ZAI_CHAT_COMPLETIONS_URL,
    {
      model: ZAI_VISION_MODEL,
      temperature: 0.25,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${zaiApiKey}`,
      },
      timeout: 90000,
    },
  );

  return data;
}

async function zaiDiagnoseCropDirect(
  imageUri: string,
  user: User,
  scanPrompt?: string,
): Promise<DiagnosisOutcome> {
  const { base64, mimeType } = await readImageForVision(imageUri);
  if (!base64 || base64.length < 256) {
    throw new Error(
      'Image could not be read for analysis. On web, re-upload the photo; on mobile, try capturing again.',
    );
  }

  const prompt = buildVisionScanPrompt(user, scanPrompt);
  const data = await requestZaiVisionDirect(mimeType, base64, prompt);

  if (__DEV__) {
    console.log('[Z.ai scan]', `mime=${mimeType}`, `imageBytes=${base64.length}`, 'raw=', JSON.stringify(data));
  }

  const rawText = extractZaiResponseText(data);
  const parsed = parseVisionDiagnosis(rawText);
  if (!parsed) {
    throw new Error('Vision response was not valid JSON — try again with a clearer photo.');
  }

  return buildDiagnosisFromVision(parsed, imageUri);
}

async function apiDiagnoseCrop(
  imageUri: string,
  user: User,
  scanPrompt?: string,
): Promise<DiagnosisOutcome> {
  const { base64, mimeType } = await readImageForVision(imageUri);
  if (!base64 || base64.length < 256) {
    throw new Error(
      'Image could not be read for analysis. On web, re-upload the photo; on mobile, try capturing again.',
    );
  }

  const prompt = buildVisionScanPrompt(user, scanPrompt);
  const result = await aiApiPost<DiagnoseCropResponse>(
    API_ENDPOINTS.crops.diagnose,
    { imageBase64: base64, mimeType, prompt },
    { timeout: 90000 },
  );

  return diagnosisFromApiResponse(result, imageUri);
}

export async function diagnoseCropImage(
  imageUri: string,
  user: User,
  options?: { scanPrompt?: string },
): Promise<DiagnosisOutcome> {
  if (hasAiApi) {
    try {
      return await apiDiagnoseCrop(imageUri, user, options?.scanPrompt);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Scan API] failed:', toApiError(error).message);
      }
      throw new Error(scanErrorMessage(error));
    }
  }

  if (env.zaiApiKey) {
    try {
      return await zaiDiagnoseCropDirect(imageUri, user, options?.scanPrompt);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Z.ai scan] failed:', toApiError(error).message);
      }
      throw new Error(scanErrorMessage(error));
    }
  }

  throw new Error(
    'Crop scanner is not configured. Set EXPO_PUBLIC_AI_API_URL (with ZAI_API_KEY in api/.env) or EXPO_PUBLIC_ZAI_API_KEY.',
  );
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

// Re-export for tests or other callers
export { buildVisionScanPrompt };
