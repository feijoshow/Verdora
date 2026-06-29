import type { ScanChatContext, User } from '../../types';
import { getChatLocationLabel } from '../../utils/locationHelpers';
import { getUserCropScans, getUserFarmingRecords } from '../analytics/dataCollectionService';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Namibia dry season roughly May–September (southern hemisphere winter). */
export function isNamibiaDrySeason(date = new Date()): boolean {
  const month = date.getMonth() + 1;
  return month >= 5 && month <= 9;
}

export function currentMonthName(date = new Date()): string {
  return MONTH_NAMES[date.getMonth()];
}

export interface FarmerAiContext {
  crops: string[];
  locationLabel: string;
  scanSummary: string;
  calendarSummary: string;
  seasonNote: string;
}

/** Rich context block for chat system prompts — uses real profile + activity data. */
export async function buildFarmerAiContext(user: User): Promise<FarmerAiContext> {
  const [farming, scans] = await Promise.all([
    getUserFarmingRecords(user.id),
    getUserCropScans(user.id),
  ]);

  const crops = [
    ...new Set([...(user.cropsPlanted ?? []), ...farming.map((r) => r.cropName)]),
  ];

  const locationLabel = getChatLocationLabel(user);

  const scanSummary =
    scans.length === 0
      ? 'No crop scans yet.'
      : scans
          .slice(0, 3)
          .map((s) => {
            const disease = s.disease ? ` — ${s.disease}` : ' — healthy';
            return `${s.cropType}${disease} (${new Date(s.timestamp).toLocaleDateString()})`;
          })
          .join('; ');

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = farming
    .filter((f) => f.plantDate >= today)
    .sort((a, b) => a.plantDate.localeCompare(b.plantDate))[0];

  const calendarSummary = upcoming
    ? `Next planting: ${upcoming.cropName} on ${upcoming.plantDate}${upcoming.fieldName ? ` (${upcoming.fieldName})` : ''}.`
    : farming.length > 0
      ? `Last recorded crop: ${farming.sort((a, b) => b.plantDate.localeCompare(a.plantDate))[0].cropName}.`
      : 'No calendar entries yet.';

  const month = currentMonthName();
  const seasonNote = isNamibiaDrySeason()
    ? `${month} is dry/cool season in much of Namibia — focus on irrigation timing and frost protection where relevant.`
    : `${month} — consider local wet-season planting windows for rain-fed crops.`;

  return { crops, locationLabel, scanSummary, calendarSummary, seasonNote };
}

export async function buildChatSystemPrompt(
  user: User,
  scanContext?: ScanChatContext,
): Promise<string> {
  const ctx = await buildFarmerAiContext(user);
  const cropList = ctx.crops.length > 0 ? ctx.crops.join(', ') : 'none registered yet';

  const scanFocus = scanContext
    ? `\nACTIVE SCAN CONTEXT (farmer is asking follow-up questions about this scan):\n` +
      `- Crop: ${scanContext.cropName}\n` +
      `- Condition: ${scanContext.disease ?? 'healthy / no disease detected'}\n` +
      `- Confidence: ${Math.round(scanContext.confidence * 100)}%\n` +
      `- Treatment already suggested: ${scanContext.treatment}\n` +
      (scanContext.fieldName ? `- Field: ${scanContext.fieldName}\n` : '') +
      (scanContext.scanPrompt ? `- Farmer's scan note: "${scanContext.scanPrompt}"\n` : '') +
      `- Scanned: ${new Date(scanContext.scannedAt).toLocaleString()}\n` +
      `Answer follow-up questions about THIS scan specifically. Reference the crop, disease/pest, and treatment above.\n\n`
    : '';

  return (
    `You are Verdora, a farming assistant for Namibian small-scale and commercial farmers.\n` +
    `Farmer location: ${ctx.locationLabel}.\n` +
    `Registered crops: ${cropList}.\n` +
    `Farm type: ${user.farmerType ?? 'unspecified'}. Soil: ${user.soilType ?? 'unspecified'}.\n` +
    `Farming methods: ${user.farmingMethods?.join(', ') || 'unspecified'}.\n` +
    `Recent scans: ${ctx.scanSummary}\n` +
    `Calendar: ${ctx.calendarSummary}\n` +
    `Season: ${ctx.seasonNote}\n\n` +
    scanFocus +
    `Rules:\n` +
    `- Use the farmer's actual crops and location in every answer.\n` +
    `- Prefer low-cost, locally available interventions (neem, crop rotation, mulching, drip irrigation).\n` +
    `- Keep answers concise (2–4 short paragraphs max unless they ask for detail).\n` +
    `- If they refer to "that crop" or "it", use recent scan/calendar context.\n` +
    `- When unsure, suggest the Weather tab, Crop Scanner, or MAFWLR extension services.\n` +
    `- Do not invent crops they have not registered unless giving general Namibia advice.`
  );
}
