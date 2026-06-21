import type { User } from '../../types';
import { getWeatherGeocodeQuery } from '../../utils/locationHelpers';
import type { FarmerSummary } from '../data/farmerDataService';
import { findPlantingGuide } from '../calendar/plantingGuideService';
import { isNamibiaDrySeason } from './farmerContext';

/** Contextual quick prompts shown before the first chat message. */
export function buildQuickPrompts(user: User, summary: FarmerSummary): string[] {
  const { crops, recentScans } = summary;
  const location = getWeatherGeocodeQuery(user) ?? 'my area';

  if (crops.length === 0) {
    return [
      'What crops suit small farms in Namibia?',
      'How do I add my first crop in Calendar?',
      'When is the best planting season here?',
    ];
  }

  const primary = crops[0];
  const guide = findPlantingGuide(primary);
  const prompts: string[] = [];

  if (guide) {
    prompts.push(`Is ${primary} a good crop to plant now in ${location}?`);
  } else {
    prompts.push(`When should I plant ${primary} in ${location}?`);
  }

  const lastScan = recentScans[0];
  if (lastScan?.disease) {
    prompts.push(`How do I treat ${lastScan.disease} on my ${lastScan.cropName}?`);
  } else if (lastScan) {
    prompts.push(`My last scan showed ${lastScan.cropName} — what should I watch for next?`);
  }

  if (isNamibiaDrySeason()) {
    prompts.push(`Dry-season tips for ${primary} in ${location}`);
  } else {
    prompts.push(`Weather and watering advice for ${primary}`);
  }

  if (crops.length > 1) {
    prompts.push(`Should I rotate ${primary} with ${crops[1]}?`);
  }

  return prompts.slice(0, 4);
}
