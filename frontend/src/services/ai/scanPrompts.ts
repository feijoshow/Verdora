/**
 * Vision scanner prompts and response normalization.
 */
import type { DiagnosisResult, ScanChatContext, User } from '../../types';
import { getChatLocationLabel } from '../../utils/locationHelpers';
import {
  GEMINI_CROP_CATALOG,
  NAMIBIA_TREATMENT_HINTS,
  normalizeCropName,
  titleCaseCropName,
} from '../ai/cropCatalog';

export interface VisionDiagnosisPayload {
  cropName?: string;
  disease?: string | null;
  confidence?: number;
  treatment?: string;
  symptoms?: string;
}

const EXTRA_SCAN_CROPS =
  'Banana, Plantain, Avocado, Papaya, Citrus, Orange, Lemon, Grape, Pepper, Chilli, ' +
  'Sweet potato, Potato, Sweetcorn, Maize, Sorghum, Wheat, Barley, Sunflower, ' +
  'Pumpkin, Butternut, Spinach, Lettuce, Kale, Garlic, Ginger, Herbs';

export function buildVisionScanPrompt(user: User, scanPrompt?: string): string {
  const location = getChatLocationLabel(user);
  const farmerCrops = user.cropsPlanted?.length
    ? user.cropsPlanted.join(', ')
    : 'not specified';
  const farmerFocus = scanPrompt?.trim()
    ? `\nFARMER'S FOCUS FOR THIS SCAN:\n"${scanPrompt.trim()}"\n` +
      `Address this concern directly in your diagnosis and treatment advice while still identifying the crop and any disease accurately.\n\n`
    : '';

  return (
    `You are an expert agricultural pathologist for farmers in Namibia and southern Africa.\n\n` +
    `TASK: Examine the photo and identify (1) the plant/crop species and (2) any disease, pest damage, ` +
    `deficiency, or confirm if it looks healthy.\n\n` +
    `IDENTIFICATION RULES:\n` +
    `- Accept ALL farm and garden plants: fruits (banana, mango, citrus, avocado), vegetables ` +
    `(tomato, cabbage, beetroot, onion), grains (mahangu, maize, sorghum), legumes, trees, and ornamentals grown as crops.\n` +
    `- If ANY plant part is visible (leaf, fruit, stem, flower, trunk, peel, spot on foliage), ` +
    `identify the species. Do NOT respond "not a crop" for plant photos.\n` +
    `- Only use cropName "not a crop" when the image clearly has NO plant (person, animal, vehicle, ` +
    `tool, empty soil, sky, wall, or unrelated object).\n` +
    `- Bananas and plantains are crops — identify leaf spots as Sigatoka, Panama disease, etc. when visible.\n` +
    `- Name specific diseases when possible (e.g. "Black Sigatoka", "Early blight", "Powdery mildew", ` +
    `"Cercospora leaf spot", "Mosaic virus", "Anthracnose") rather than only "spots".\n\n` +
    `CONFIDENCE (0.0–1.0):\n` +
    `- 0.75+ when crop and condition are clear\n` +
    `- 0.55–0.74 when crop is clear but disease is uncertain\n` +
    `- 0.40–0.54 when plant is visible but species is uncertain — still name your best guess\n` +
    `- Below 0.40 only if image is very blurry or plant is not visible\n\n` +
    `Known crops (prefer these names when they match): ${GEMINI_CROP_CATALOG}, ${EXTRA_SCAN_CROPS}.\n` +
    `Farmer location: ${location}. Farmer's registered crops: ${farmerCrops}.\n\n` +
    farmerFocus +
    `${NAMIBIA_TREATMENT_HINTS}\n\n` +
    `Respond ONLY with valid JSON (no markdown):\n` +
    `{"cropName":"string","disease":"string or null if healthy","confidence":0.75,` +
    `"treatment":"2-4 sentences of practical advice","symptoms":"brief visible signs you observed"}`
  );
}

export function normalizeConfidence(value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0.5;
  const n = value > 1 ? value / 100 : value;
  return Math.min(1, Math.max(0, n));
}

function isExplicitNonCropName(name: string | undefined): boolean {
  const lower = name?.trim().toLowerCase() ?? '';
  return (
    lower === 'not a crop' ||
    lower === 'non-crop' ||
    lower === 'no crop' ||
    lower === 'not crop' ||
    lower.startsWith('not a crop') ||
    lower.includes('not a plant')
  );
}

function hasPlantEvidence(parsed: VisionDiagnosisPayload): boolean {
  return Boolean(
    parsed.disease?.trim() ||
      parsed.symptoms?.trim() ||
      (parsed.treatment?.trim() &&
        !parsed.treatment.toLowerCase().includes('does not look like a crop')),
  );
}

export function resolveVisionCropName(parsed: VisionDiagnosisPayload): string {
  const raw = parsed.cropName?.trim();
  if (raw && !isExplicitNonCropName(raw)) {
    return normalizeCropName(raw) ?? titleCaseCropName(raw);
  }
  if (hasPlantEvidence(parsed)) {
    return 'Unidentified crop';
  }
  return 'Not a crop';
}

export function shouldRejectAsNonCrop(
  parsed: VisionDiagnosisPayload,
  confidence: number,
): boolean {
  if (hasPlantEvidence(parsed)) return false;
  if (!isExplicitNonCropName(parsed.cropName)) return false;
  return confidence < 0.55;
}

export function buildTreatmentText(parsed: VisionDiagnosisPayload, lowConfidence: boolean): string {
  const parts: string[] = [];
  if (parsed.symptoms?.trim()) {
    parts.push(`Observed: ${parsed.symptoms.trim()}`);
  }
  if (parsed.treatment?.trim()) {
    parts.push(parsed.treatment.trim());
  }
  if (parts.length > 0) {
    return parts.join('\n\n');
  }
  if (lowConfidence) {
    return 'Try a closer photo of the affected leaf or fruit in natural light for a more accurate diagnosis.';
  }
  return 'Monitor the plant and scan again in a few days if symptoms spread.';
}

export function buildScanFollowUpPrompts(result: {
  cropName: string;
  disease: string | null;
}): string[] {
  const crop = result.cropName;
  if (result.disease) {
    return [
      `What causes ${result.disease} on ${crop}?`,
      `What is the safest treatment for ${result.disease}?`,
      `Will ${result.disease} spread to my other crops?`,
      `Can I still harvest this ${crop}?`,
    ];
  }
  return [
    `How do I keep my ${crop} healthy?`,
    `What pests should I watch for on ${crop}?`,
    `When should I scan ${crop} again?`,
    `What nutrients does ${crop} need right now?`,
  ];
}

export function diagnosisToScanChatContext(result: DiagnosisResult): ScanChatContext {
  return {
    cropName: result.cropName,
    disease: result.disease,
    confidence: result.confidence,
    treatment: result.treatment,
    scanPrompt: result.scanPrompt,
    fieldName: result.fieldName,
    scannedAt: result.scannedAt,
  };
}
