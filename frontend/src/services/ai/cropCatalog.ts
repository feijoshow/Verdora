import type { User } from '../../types';
import { CROP_GUIDE_NAMES } from '../../data/cropPlantingGuide';
import { CROP_KNOWLEDGE } from '../../data/cropKnowledge';
import plantationDataset from '../../data/plantationDataset.json';
import type { CropEntry } from '../api/cropLibraryService';

/** Extra crops valid for scanner ID but not yet in planting guide. */
const EXTRA_SCAN_CROP_NAMES = [
  'Banana',
  'Plantain',
  'Avocado',
  'Papaya',
  'Citrus',
  'Orange',
  'Lemon',
  'Grape',
  'Pepper',
  'Chilli',
  'Sweet potato',
  'Potato',
  'Maize',
  'Sweetcorn',
  'Pumpkin',
  'Butternut',
  'Spinach',
  'Lettuce',
  'Garlic',
  'Pawpaw',
  'Guava',
  'Lychee',
  'Macadamia',
  'Pecan nut',
  'Herbs',
];

/** Map common AI outputs to canonical crop names. */
const CROP_ALIASES: Record<string, string> = {
  banana: 'Banana',
  bananas: 'Banana',
  plantain: 'Banana',
  plantains: 'Banana',
  cavendish: 'Banana',
  'banana plant': 'Banana',
  'banana leaf': 'Banana',
  mangoes: 'Mango',
  'mango tree': 'Mango',
  mahangu: 'Mahangu',
  millet: 'Mahangu',
  'pearl millet': 'Mahangu',
  oshikundu: 'Mahangu',
  maize: 'Maize',
  corn: 'Corn',
  sweetcorn: 'Maize',
  'sweet corn': 'Maize',
  beet: 'Beetroot',
  capsicum: 'Pepper',
  chili: 'Chilli',
  chilli: 'Chilli',
  chile: 'Chilli',
  pepper: 'Pepper',
  'bell pepper': 'Pepper',
  'sweet potato': 'Sweet potato',
  potato: 'Potato',
  pawpaw: 'Papaya',
  papaya: 'Papaya',
  orange: 'Orange',
  lemon: 'Lemon',
  lime: 'Citrus',
  citrus: 'Citrus',
  grape: 'Grape',
  grapes: 'Grape',
  tomato: 'Tomato',
  tomatoes: 'Tomato',
  cabbage: 'Cabbage',
  onion: 'Onion',
  onions: 'Onion',
  beans: 'Beans',
  'green beans': 'Beans',
  cowpeas: 'Beans',
  njove: 'Beans',
  sorghum: 'Sorghum',
  watermelon: 'Watermelon',
  'water melon': 'Watermelon',
  butternut: 'Butternut',
  pumpkin: 'Pumpkin',
  carrot: 'Carrot',
  carrots: 'Carrot',
  cucumber: 'Cucumber',
  broccoli: 'Broccoli',
  avocado: 'Avocado',
  guava: 'Guava',
};

/** Canonical crop names used across scanner, calendar, and chat. */
export function getKnownCropNames(): string[] {
  const fromDataset = (plantationDataset as CropEntry[]).map((c) => c.crop_name);
  return [
    ...new Set([
      ...Object.keys(CROP_KNOWLEDGE),
      ...CROP_GUIDE_NAMES,
      ...fromDataset,
      ...EXTRA_SCAN_CROP_NAMES,
      ...Object.values(CROP_ALIASES),
    ]),
  ].sort();
}

export function titleCaseCropName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Map AI output to the closest known crop name (case-insensitive). */
export function normalizeCropName(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const lower = raw.trim().toLowerCase();

  if (
    lower === 'not a crop' ||
    lower === 'non-crop' ||
    lower === 'no crop' ||
    lower === 'not crop' ||
    lower === 'unknown crop'
  ) {
    return null;
  }

  const alias = CROP_ALIASES[lower];
  if (alias) return alias;

  for (const [key, value] of Object.entries(CROP_ALIASES)) {
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
  }

  const known = getKnownCropNames();
  const exact = known.find((n) => n.toLowerCase() === lower);
  if (exact) return exact;

  if (lower.length >= 3) {
    const partial = known.find(
      (n) =>
        lower.includes(n.toLowerCase()) ||
        n.toLowerCase().includes(lower) ||
        n.toLowerCase().startsWith(lower.slice(0, 4)),
    );
    if (partial) return partial;
  }

  return titleCaseCropName(raw);
}

export const NAMIBIA_TREATMENT_HINTS =
  'Give practical Namibia-relevant advice: remove infected leaves, improve drainage and airflow, ' +
  'avoid overhead irrigation on diseased foliage, crop rotation, neem oil or copper-based sprays from ' +
  'local agro-dealers, approved fungicides for severe fungal disease, isolate infected plants. ' +
  'Consult your nearest MAFWLR extension officer for widespread outbreaks.';

export const GEMINI_CROP_CATALOG = getKnownCropNames().join(', ');
