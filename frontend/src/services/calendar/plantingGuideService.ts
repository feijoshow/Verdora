import { CROP_PLANTING_GUIDE, type CropPlantingGuide } from '../../data/cropPlantingGuide';
import plantationDataset from '../../data/plantationDataset.json';
import type { CropEntry } from '../api/cropLibraryService';
import { normalizeCropName } from '../ai/cropCatalog';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Consistent crop name for calendar entries (Mahangu not mahangu). */
export function formatCropDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  const canonical = normalizeCropName(trimmed);
  if (canonical) return canonical;
  return trimmed
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function guideFromDatasetEntry(entry: CropEntry): CropPlantingGuide {
  const days = entry.maturity_days ?? 90;
  const extras = [
    entry.spacing ? `Spacing: ${entry.spacing}.` : '',
    entry.yield_estimate ? `Typical yield: ${entry.yield_estimate}.` : '',
    entry.temperature_range ? `Temperature: ${entry.temperature_range}°C.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: `dataset-${normalize(entry.crop_name).replace(/\s+/g, '-')}`,
    name: entry.crop_name,
    aliases: [],
    bestPlantingMonths: entry.planting_window.join(', '),
    harvestWindow: `${days} days after planting (typical)`,
    maturityDays: days,
    maturityDaysRange: `${days} days`,
    soilType: 'Adapt to local soil — consult your extension officer',
    soilPh: 'Varies by crop and field',
    irrigation: entry.water_requirement ?? 'Match irrigation to crop stage and season',
    waterNote: extras || 'Adjust water to rainfall and growth stage',
  };
}

/** Built-in guides + plantation dataset — no generic AI fallback. */
export function lookupLocalPlantingGuide(query: string): CropPlantingGuide | null {
  const fromBuiltIn = findPlantingGuide(query);
  if (fromBuiltIn) return fromBuiltIn;

  const q = normalize(query);
  if (!q) return null;

  const dataset = plantationDataset as CropEntry[];
  const match = dataset.find(
    (entry) =>
      normalize(entry.crop_name) === q ||
      normalize(entry.crop_name).includes(q) ||
      q.includes(normalize(entry.crop_name)),
  );
  return match ? guideFromDatasetEntry(match) : null;
}

function mergeGuides(extraGuides: CropPlantingGuide[] = []): CropPlantingGuide[] {
  const datasetGuides = (plantationDataset as CropEntry[]).map(guideFromDatasetEntry);
  const seen = new Set<string>();
  const merged: CropPlantingGuide[] = [];

  for (const guide of [...CROP_PLANTING_GUIDE, ...datasetGuides, ...extraGuides]) {
    const key = normalize(guide.name);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(guide);
  }

  return merged;
}

function matchGuide(guides: CropPlantingGuide[], query: string): CropPlantingGuide | null {
  const q = normalize(query);
  if (!q) return null;

  return (
    guides.find(
      (g) =>
        normalize(g.name) === q ||
        g.aliases.some((a) => normalize(a) === q) ||
        normalize(g.name).includes(q) ||
        g.aliases.some((a) => normalize(a).includes(q)),
    ) ?? null
  );
}

/** Find planting guide by crop name or alias */
export function findPlantingGuide(
  query: string,
  extraGuides: CropPlantingGuide[] = [],
): CropPlantingGuide | null {
  return matchGuide(mergeGuides(extraGuides), query);
}

/** Search guides for autocomplete */
export function searchPlantingGuides(
  query: string,
  extraGuides: CropPlantingGuide[] = [],
): CropPlantingGuide[] {
  const guides = mergeGuides(extraGuides);
  const q = normalize(query);
  if (!q) return guides;

  return guides.filter(
    (g) =>
      normalize(g.name).includes(q) ||
      g.aliases.some((a) => normalize(a).includes(q)),
  );
}

/** Quick-access chips: built-in staples plus the user's saved custom crops */
export function getQuickAccessGuides(extraGuides: CropPlantingGuide[] = []): CropPlantingGuide[] {
  const builtIn = CROP_PLANTING_GUIDE.slice(0, 10);
  const builtInNames = new Set(builtIn.map((g) => normalize(g.name)));
  const custom = extraGuides.filter((g) => !builtInNames.has(normalize(g.name)));
  return [...builtIn, ...custom];
}

/** Calculate expected harvest date from plant date + maturity days */
export function calculateHarvestDate(plantDateIso: string, maturityDays: number): string {
  const d = new Date(plantDateIso);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + maturityDays);
  return d.toISOString().slice(0, 10);
}

export function formatDisplayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/** Check if current month falls in best planting window (rough match) */
export function isGoodTimeToPlant(guide: CropPlantingGuide, date = new Date()): boolean {
  if (guide.bestPlantingMonths.toLowerCase().includes('year-round')) return true;

  const month = date.toLocaleString('en-US', { month: 'long' });
  const short = date.toLocaleString('en-US', { month: 'short' });
  const text = guide.bestPlantingMonths.toLowerCase();
  return text.includes(month.toLowerCase()) || text.includes(short.toLowerCase());
}

export function buildPlantingSummary(guide: CropPlantingGuide, plantDate?: string): {
  harvestDate: string | null;
  harvestLabel: string;
  inSeason: boolean;
} {
  const inSeason = isGoodTimeToPlant(guide);
  if (!plantDate) {
    return {
      harvestDate: null,
      harvestLabel: guide.harvestWindow,
      inSeason,
    };
  }

  const harvestDate = calculateHarvestDate(plantDate, guide.maturityDays);
  return {
    harvestDate,
    harvestLabel: harvestDate ? formatDisplayDate(harvestDate) : guide.harvestWindow,
    inSeason,
  };
}
