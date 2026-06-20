import type { User } from '../../types';
import { CROP_GUIDE_NAMES } from '../../data/cropPlantingGuide';
import { CROP_KNOWLEDGE } from '../../data/cropKnowledge';
import plantationDataset from '../../data/plantationDataset.json';
import type { CropEntry } from '../api/cropLibraryService';

/** Canonical crop names used across scanner, calendar, and chat. */
export function getKnownCropNames(): string[] {
  const fromDataset = (plantationDataset as CropEntry[]).map((c) => c.crop_name);
  return [...new Set([...Object.keys(CROP_KNOWLEDGE), ...CROP_GUIDE_NAMES, ...fromDataset])].sort();
}

/** Map AI output to the closest known crop name (case-insensitive). */
export function normalizeCropName(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const lower = raw.trim().toLowerCase();
  if (lower.includes('not a crop') || lower.includes('no crop') || lower.includes('unknown')) {
    return null;
  }
  const known = getKnownCropNames();
  const exact = known.find((n) => n.toLowerCase() === lower);
  if (exact) return exact;

  // Avoid short fuzzy matches (e.g. "ca" → Cabbage) when the model is uncertain.
  if (lower.length >= 4) {
    const partial = known.find(
      (n) => lower.includes(n.toLowerCase()) || n.toLowerCase().includes(lower),
    );
    if (partial) return partial;
  }

  return raw.trim();
}

export const NAMIBIA_TREATMENT_HINTS =
  'Prefer practical Namibia-relevant advice: remove infected leaves, improve drainage, ' +
  'crop rotation, neem-based sprays, approved fungicides from local agro-dealers, ' +
  'consult your nearest MAFWLR extension officer for severe outbreaks.';

export const GEMINI_CROP_CATALOG = getKnownCropNames().join(', ');
