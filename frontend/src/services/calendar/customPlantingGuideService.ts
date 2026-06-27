import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CropPlantingGuide } from '../../data/cropPlantingGuide';
import { hasAiApi } from '../../config/env';
import { API_ENDPOINTS } from '../api/endpoints';
import { aiApiPost } from '../api/client';
import {
  formatCropDisplayName,
  lookupLocalPlantingGuide,
} from './plantingGuideService';

function storageKey(userId: string): string {
  return `@verdora_custom_guides_${userId}`;
}

function normalizeName(text: string): string {
  return formatCropDisplayName(text).toLowerCase();
}

export async function loadCustomPlantingGuides(userId: string): Promise<CropPlantingGuide[]> {
  try {
    const stored = await AsyncStorage.getItem(storageKey(userId));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as CropPlantingGuide[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomPlantingGuide(
  userId: string,
  guide: CropPlantingGuide,
): Promise<CropPlantingGuide[]> {
  const normalizedGuide: CropPlantingGuide = {
    ...guide,
    name: formatCropDisplayName(guide.name),
  };
  const existing = await loadCustomPlantingGuides(userId);
  const nameKey = normalizeName(normalizedGuide.name);
  const next = [
    normalizedGuide,
    ...existing.filter((g) => normalizeName(g.name) !== nameKey),
  ];
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  return next;
}

export async function generatePlantingGuide(
  cropName: string,
  location?: string,
): Promise<CropPlantingGuide> {
  const trimmed = formatCropDisplayName(cropName);
  if (!trimmed) {
    throw new Error('Crop name is required');
  }

  const local = lookupLocalPlantingGuide(trimmed);
  if (local) {
    return local;
  }

  if (!hasAiApi) {
    throw new Error(
      'No local guide for this crop. Start the AI server (npm run api:dev) to generate one.',
    );
  }

  const { guide } = await aiApiPost<{ guide: CropPlantingGuide }>(
    API_ENDPOINTS.calendar.plantingGuide,
    { cropName: trimmed, location },
  );
  return { ...guide, name: formatCropDisplayName(guide.name) };
}

export function isGenericFallbackGuide(guide: CropPlantingGuide): boolean {
  return (
    guide.maturityDays === 90 &&
    guide.soilType === 'Well-drained loam with organic matter' &&
    guide.irrigation === 'Drip irrigation recommended in dry season' &&
    guide.maturityDaysRange === '60–120 days (estimate)'
  );
}

/** Replace stale generic guides saved before this fix. */
export async function refreshCustomGuideIfStale(
  userId: string,
  cropName: string,
  location?: string,
): Promise<CropPlantingGuide | null> {
  const guides = await loadCustomPlantingGuides(userId);
  const key = normalizeName(cropName);
  const existing = guides.find((g) => normalizeName(g.name) === key);
  if (!existing || !isGenericFallbackGuide(existing)) {
    return existing ?? null;
  }

  try {
    const fresh = await generatePlantingGuide(cropName, location);
    await saveCustomPlantingGuide(userId, fresh);
    return fresh;
  } catch {
    return null;
  }
}
