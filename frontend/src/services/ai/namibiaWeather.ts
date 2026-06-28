import type { PlantingRecommendation } from '../api/types';
import { assessPlantingMonth, getCropByName, monthNameToIndex } from '../api/cropLibraryService';
import {
  formatCropDisplayName,
  getAllPlantingGuides,
  plantingStatusForMonth,
} from '../calendar/plantingGuideService';
import { currentMonthName, isNamibiaDrySeason } from './farmerContext';

/** Build OpenWeather query strings — tries Namibia-disambiguated forms. */
export function buildWeatherQueryVariants(location: string | undefined): string[] {
  if (!location?.trim()) return [];

  const raw = location.trim();
  const firstPart = raw.split(',')[0]?.trim() ?? raw;
  const variants = new Set<string>();

  variants.add(`${firstPart}, NA`);
  variants.add(`${firstPart}, Namibia`);
  if (firstPart !== raw) variants.add(`${raw}, Namibia`);
  variants.add(firstPart);

  return [...variants];
}

function applyWeatherAdjustments(
  cropName: string,
  status: PlantingRecommendation['status'],
  reason: string,
  temp: number,
  humidity: number,
  drySeason: boolean,
  waterNote?: string,
): { status: PlantingRecommendation['status']; reason: string } {
  let nextStatus = status;
  let nextReason = reason;

  if (drySeason && nextStatus === 'ideal') {
    const needsWater =
      waterNote?.toLowerCase().includes('high') ||
      waterNote?.toLowerCase().includes('flooded') ||
      waterNote?.toLowerCase().includes('1200');
    if (needsWater) {
      nextStatus = 'caution';
      nextReason = `${cropName} suits ${currentMonthName()} but dry season means reliable irrigation is essential before planting.`;
    }
  }

  if (temp > 35) {
    nextStatus = 'avoid';
    nextReason = `Heat stress at ${temp}°C — delay transplanting ${cropName}; water early morning if already in the ground.`;
  } else if (humidity > 80 && nextStatus === 'ideal') {
    nextStatus = 'caution';
    nextReason = `High humidity (${humidity}%) — ${cropName} can go in now but watch for fungal leaf spots; improve airflow.`;
  }

  return { status: nextStatus, reason: nextReason };
}

function reasonForStatus(
  cropName: string,
  status: PlantingRecommendation['status'],
  bestMonths: string,
  monthName: string,
): string {
  if (status === 'ideal') {
    return `${cropName} is in season in ${monthName}. Typical planting window: ${bestMonths}.`;
  }
  if (status === 'caution') {
    return `${monthName} is near the edge of the window for ${cropName} (${bestMonths}). Plant with irrigation or wait a few weeks.`;
  }
  return `${cropName} is best planted ${bestMonths}. ${monthName} is outside that window — plan for the next season or use irrigation for transplants.`;
}

function recommendationFromGuide(
  cropName: string,
  bestMonths: string,
  monthIndex: number,
  monthName: string,
  temp: number,
  humidity: number,
  drySeason: boolean,
  waterNote?: string,
  isUserCrop = false,
): PlantingRecommendation {
  let status = plantingStatusForMonth(bestMonths, monthIndex);
  let reason = reasonForStatus(cropName, status, bestMonths, monthName);

  ({ status, reason } = applyWeatherAdjustments(
    cropName,
    status,
    reason,
    temp,
    humidity,
    drySeason,
    waterNote,
  ));

  if (isUserCrop && status === 'avoid') {
    reason = `On your calendar — ${reason}`;
  }

  return { cropName, status, reason, isUserCrop };
}

const STATUS_ORDER: Record<PlantingRecommendation['status'], number> = {
  ideal: 0,
  caution: 1,
  avoid: 2,
};

/** Season-aware planting cards from the full crop catalog + the farmer's crops. */
export async function buildSeasonalCropRecommendations(
  userCrops: string[],
  temp: number,
  humidity: number,
): Promise<PlantingRecommendation[]> {
  const now = new Date();
  const monthIndex = now.getMonth() + 1;
  const monthName = currentMonthName(now);
  const drySeason = isNamibiaDrySeason(now);

  const normalizedUserCrops = [
    ...new Set(userCrops.map((c) => formatCropDisplayName(c)).filter(Boolean)),
  ];
  const userCropKeys = new Set(normalizedUserCrops.map((c) => c.toLowerCase()));

  const byKey = new Map<string, PlantingRecommendation>();

  for (const guide of getAllPlantingGuides()) {
    const cropName = formatCropDisplayName(guide.name);
    const key = cropName.toLowerCase();
    if (byKey.has(key)) continue;

    byKey.set(
      key,
      recommendationFromGuide(
        cropName,
        guide.bestPlantingMonths,
        monthIndex,
        monthName,
        temp,
        humidity,
        drySeason,
        guide.waterNote,
        userCropKeys.has(key),
      ),
    );
  }

  for (const cropName of normalizedUserCrops) {
    const key = cropName.toLowerCase();
    if (byKey.has(key)) {
      const existing = byKey.get(key)!;
      existing.isUserCrop = true;
      if (existing.status === 'avoid' && !existing.reason.startsWith('On your calendar')) {
        existing.reason = `On your calendar — ${existing.reason}`;
      }
      continue;
    }

    const entry = await getCropByName(cropName);
    if (entry && monthNameToIndex(monthName) > 0) {
      let status = assessPlantingMonth(entry, monthNameToIndex(monthName));
      let reason =
        status === 'ideal'
          ? `${cropName} fits ${monthName} (${entry.planting_window.join(', ')}).`
          : status === 'caution'
            ? `${monthName} is near the planting window for ${cropName}.`
            : `On your calendar — ${cropName} is usually planted ${entry.planting_window.join(', ')}. ${monthName} is off-season.`;

      ({ status, reason } = applyWeatherAdjustments(
        cropName,
        status,
        reason,
        temp,
        humidity,
        drySeason,
        entry.water_requirement,
      ));

      byKey.set(key, { cropName, status, reason, isUserCrop: true });
    }
  }

  const all = [...byKey.values()];

  return all.sort((a, b) => {
    const statusCmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusCmp !== 0) return statusCmp;
    if (a.isUserCrop !== b.isUserCrop) return a.isUserCrop ? -1 : 1;
    return a.cropName.localeCompare(b.cropName);
  });
}

export function drySeasonFarmingTip(temp: number, humidity: number): string {
  if (!isNamibiaDrySeason()) {
    if (temp >= 28 && humidity > 75) {
      return 'Humid conditions — delay spraying; good for transplanting if fields are ready.';
    }
    if (temp >= 20 && temp <= 30 && humidity < 70) {
      return 'Favourable for transplanting vegetables and direct-seeding.';
    }
    return 'Monitor forecast daily; protect seedlings from midday heat.';
  }

  if (temp < 10) {
    return 'Cool mornings — protect sensitive seedlings from frost; water mid-morning.';
  }
  if (humidity < 40) {
    return 'Dry season: irrigate early morning or evening; mulch to retain soil moisture. Favour year-round vegetables with drip irrigation.';
  }
  return 'Dry season — plan irrigation, conserve moisture, and favour drought-tolerant or year-round crops (cabbage, onion, tomato with water).';
}

/** Split recommendations for weather UI sections. */
export function splitPlantingRecommendations(recommendations: PlantingRecommendation[]): {
  plantNow: PlantingRecommendation[];
  yourCropsWait: PlantingRecommendation[];
} {
  const plantNow = recommendations.filter((r) => r.status === 'ideal' || r.status === 'caution');
  const yourCropsWait = recommendations.filter((r) => r.isUserCrop && r.status === 'avoid');
  return { plantNow, yourCropsWait };
}
