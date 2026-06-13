import type { DiagnosisResult, PlantingEvent, User } from '../../types';
import type { CropScanRecord, FarmingDataRecord } from '../../types/analytics';
import {
  getUserChatQuestions,
  getUserCropScans,
  getUserFarmingRecords,
} from '../analytics/dataCollectionService';

export interface FarmerSummary {
  scanCount: number;
  calendarEventCount: number;
  chatQuestionCount: number;
  crops: string[];
  recentScans: DiagnosisResult[];
  upcomingPlantings: PlantingEvent[];
}

export async function getFarmerSummary(user: User): Promise<FarmerSummary> {
  const [scans, farming, questions] = await Promise.all([
    getUserCropScans(user.id),
    getUserFarmingRecords(user.id),
    getUserChatQuestions(user.id),
  ]);

  const crops = [
    ...new Set([...(user.cropsPlanted ?? []), ...farming.map((r) => r.cropName)]),
  ];

  const recentScans = scans.slice(0, 5).map(scanRecordToDiagnosis);
  const today = new Date().toISOString().slice(0, 10);

  const upcomingPlantings: PlantingEvent[] = farming
    .filter((r) => r.plantDate >= today)
    .sort((a, b) => a.plantDate.localeCompare(b.plantDate))
    .slice(0, 5)
    .map(farmingRecordToEvent);

  return {
    scanCount: scans.length,
    calendarEventCount: farming.length,
    chatQuestionCount: questions.length,
    crops,
    recentScans,
    upcomingPlantings,
  };
}

export function scanRecordToDiagnosis(scan: CropScanRecord): DiagnosisResult {
  return {
    id: scan.id,
    cropName: scan.cropType,
    disease: scan.disease,
    confidence: scan.confidence,
    treatment: scan.treatment,
    imageUri: scan.imageUri,
    scannedAt: scan.timestamp,
    fieldId: scan.fieldId,
    fieldName: scan.fieldName,
  };
}

function farmingRecordToEvent(r: FarmingDataRecord): PlantingEvent {
  return {
    id: r.id,
    cropName: r.cropName,
    plantDate: r.plantDate,
    harvestDate: r.harvestDate,
    fieldName: r.fieldName,
    notes: r.farmingMethods?.join(', '),
  };
}

export async function getPrimaryCropForUser(user: User): Promise<string | null> {
  const farming = await getUserFarmingRecords(user.id);
  if (farming.length > 0) {
    const sorted = [...farming].sort((a, b) => b.plantDate.localeCompare(a.plantDate));
    return sorted[0].cropName;
  }
  return user.cropsPlanted?.[0] ?? null;
}
