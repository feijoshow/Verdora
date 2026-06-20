import { env, hasAiApi } from '../../config/env';
import {
  GEMINI_CROP_CATALOG,
  NAMIBIA_TREATMENT_HINTS,
  normalizeCropName,
} from '../ai/cropCatalog';
import type { DiagnosisResult, User } from '../../types';
import { generateId } from '../../utils/generateId';
import { readImageForVision } from '../../utils/readImageBase64';
import { scanRecordToDiagnosis } from '../data/farmerDataService';
import { getUserCropScans } from '../analytics/dataCollectionService';
import { API_ENDPOINTS, ZAI_VISION_MODEL, ZAI_CHAT_COMPLETIONS_URL } from './endpoints';
import { aiApiPost, externalClient } from './client';
import { toApiError } from './errors';
import type { DiagnoseCropResponse, DiagnosisOutcome } from './types';

interface VisionDiagnosisPayload {
  cropName?: string;
  disease?: string | null;
  confidence?: number;
  treatment?: string;
}

interface ZaiChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: string };
}

function scanErrorMessage(error: unknown): string {
  const apiError = toApiError(error);
  const msg = apiError.message.toLowerCase();
  const status = apiError.status;

  if (status === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return 'Scanner rate limit reached — wait a moment and try again.';
  }
  if (status === 403 || msg.includes('403') || msg.includes('permission') || msg.includes('invalid api key')) {
    return 'Scanner API key rejected. Check ZAI_API_KEY in api/.env and restart npm run api:dev.';
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('econnrefused')) {
    return 'No connection — check your network and that npm run api:dev is running.';
  }
  if (msg.includes('zai_api_key') || msg.includes('not configured on the api')) {
    return 'Scan API missing ZAI_API_KEY — set it in api/.env and restart the server.';
  }
  if (msg.includes('not valid json') || msg.includes('empty response') || msg.includes('unparseable')) {
    return "Couldn't get a confident read — try a closer photo in better light.";
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

function buildVisionScanPrompt(user: User): string {
  const crops = user.cropsPlanted?.join(', ') ?? 'unknown';
  return (
    `You are Verdora crop disease analyst for Namibian farmers. ` +
    `Farmer location: ${user.location ?? 'Namibia'}. Registered crops: ${crops}. ` +
    `Use crop names ONLY from this catalog when possible: ${GEMINI_CROP_CATALOG}. ` +
    `If the image is not a plant/crop (e.g. person, tool, soil only, sky, wall), set cropName to "not a crop" and confidence below 0.3. ` +
    `If the image is too blurry or too far away to identify, set confidence below 0.4 and say so in treatment. ` +
    `Do not guess a crop name when uncertain — prefer low confidence over a wrong identification. ` +
    `${NAMIBIA_TREATMENT_HINTS} ` +
    `Respond ONLY with valid JSON (no markdown): ` +
    `{"cropName":"string","disease":"string or null if healthy","confidence":0.0,"treatment":"actionable advice"}`
  );
}

function isNonCropImage(parsed: VisionDiagnosisPayload): boolean {
  const name = parsed.cropName?.toLowerCase() ?? '';
  return (
    name.includes('not a crop') ||
    name.includes('no crop') ||
    name.includes('not crop') ||
    name.includes('non-crop')
  );
}

function normalizeConfidence(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  // Accept 0–1 or 0–100 from the model
  const n = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, n));
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
  const lowConfidence = confidence < 0.45;
  const nonCrop =
    isNonCropImage(parsed) || (confidence < 0.35 && !normalizeCropName(parsed.cropName));

  if (nonCrop) {
    return {
      result: {
        id: generateId('diag'),
        cropName: 'Not a crop',
        disease: null,
        confidence,
        treatment:
          parsed.treatment?.trim() ||
          'This does not look like a crop photo. Frame a clear shot of the affected leaf or plant in good light.',
        imageUri,
        scannedAt: new Date().toISOString(),
      },
      notice: "Couldn't get a confident read — try a closer photo in better light.",
    };
  }

  const cropName = normalizeCropName(parsed.cropName) ?? parsed.cropName?.trim() ?? 'Unknown crop';

  return {
    result: {
      id: generateId('diag'),
      cropName,
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
      ? "Couldn't get a confident read — try a closer photo in better light."
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

async function zaiDiagnoseCropDirect(imageUri: string, user: User): Promise<DiagnosisOutcome> {
  const { base64, mimeType } = await readImageForVision(imageUri);
  if (!base64 || base64.length < 256) {
    throw new Error(
      'Image could not be read for analysis. On web, re-upload the photo; on mobile, try capturing again.',
    );
  }

  const prompt = buildVisionScanPrompt(user);
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

async function apiDiagnoseCrop(imageUri: string, user: User): Promise<DiagnosisOutcome> {
  const { base64, mimeType } = await readImageForVision(imageUri);
  if (!base64 || base64.length < 256) {
    throw new Error(
      'Image could not be read for analysis. On web, re-upload the photo; on mobile, try capturing again.',
    );
  }

  const prompt = buildVisionScanPrompt(user);
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
): Promise<DiagnosisOutcome> {
  if (hasAiApi) {
    try {
      return await apiDiagnoseCrop(imageUri, user);
    } catch (error) {
      if (__DEV__) {
        console.warn('[Scan API] failed:', toApiError(error).message);
      }
      throw new Error(scanErrorMessage(error));
    }
  }

  if (env.zaiApiKey) {
    try {
      return await zaiDiagnoseCropDirect(imageUri, user);
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
