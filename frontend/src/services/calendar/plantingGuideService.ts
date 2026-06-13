import { CROP_PLANTING_GUIDE, type CropPlantingGuide } from '../../data/cropPlantingGuide';

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

/** Find planting guide by crop name or alias */
export function findPlantingGuide(query: string): CropPlantingGuide | null {
  const q = normalize(query);
  if (!q) return null;

  return (
    CROP_PLANTING_GUIDE.find(
      (g) =>
        normalize(g.name) === q ||
        g.aliases.some((a) => normalize(a) === q) ||
        normalize(g.name).includes(q) ||
        g.aliases.some((a) => a.includes(q)),
    ) ?? null
  );
}

/** Search guides for autocomplete */
export function searchPlantingGuides(query: string): CropPlantingGuide[] {
  const q = normalize(query);
  if (!q) return CROP_PLANTING_GUIDE;

  return CROP_PLANTING_GUIDE.filter(
    (g) =>
      normalize(g.name).includes(q) ||
      g.aliases.some((a) => a.includes(q)),
  );
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
