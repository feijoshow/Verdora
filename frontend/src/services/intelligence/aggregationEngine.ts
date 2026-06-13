import plantationDataset from '../../data/plantationDataset.json';
import type {
  ChatQuestionRecord,
  CropScanRecord,
  DiseaseAlert,
  EnvironmentLogRecord,
  FarmingDataRecord,
  KnowledgeGapReport,
  PlantingWindowInsight,
  RegionalIntelligence,
} from '../../types/analytics';
import {
  ALERT_LOOKBACK_DAYS,
  centroid,
  DEFAULT_ALERT_RADIUS_KM,
  distanceKm,
  extractRegion,
  MIN_SCANS_FOR_ALERT,
  resolveCoordinates,
} from './geospatial';
import { extractChatTopic, priorityFromCount } from './topicExtraction';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface GeoScan {
  id: string;
  disease: string;
  cropType: string;
  lat: number;
  lng: number;
  location: string;
  timestamp: string;
}

function severityFromCount(count: number): DiseaseAlert['severity'] {
  if (count >= 15) return 'critical';
  if (count >= 8) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

function alertMessage(disease: string, count: number, radiusKm: number, crops: string[]): string {
  const cropList = crops.slice(0, 3).join(', ');
  return `${disease} detected in ${count} scans within ${radiusKm} km — crops affected: ${cropList}. Inspect fields and consider preventive treatment.`;
}

/** Cluster disease scans into geospatial outbreak alerts */
export function aggregateDiseaseAlerts(
  scans: CropScanRecord[],
  radiusKm = DEFAULT_ALERT_RADIUS_KM,
): DiseaseAlert[] {
  const cutoff = Date.now() - ALERT_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
  const geoScans: GeoScan[] = [];

  for (const scan of scans) {
    if (!scan.disease) continue;
    if (new Date(scan.timestamp).getTime() < cutoff) continue;
    const coords = resolveCoordinates(scan.location, scan.latitude, scan.longitude);
    if (!coords) continue;
    geoScans.push({
      id: scan.id,
      disease: scan.disease,
      cropType: scan.cropType,
      lat: coords.lat,
      lng: coords.lng,
      location: scan.location,
      timestamp: scan.timestamp,
    });
  }

  const alerts: DiseaseAlert[] = [];
  const used = new Set<string>();

  for (const seed of geoScans) {
    if (used.has(seed.id)) continue;

    const cluster = geoScans.filter(
      (s) =>
        s.disease === seed.disease &&
        !used.has(s.id) &&
        distanceKm(seed.lat, seed.lng, s.lat, s.lng) <= radiusKm,
    );

    if (cluster.length < MIN_SCANS_FOR_ALERT) continue;
    cluster.forEach((s) => used.add(s.id));

    const center = centroid(cluster.map((s) => ({ lat: s.lat, lng: s.lng })));
    const crops = [...new Set(cluster.map((s) => s.cropType))];
    const regions = [...new Set(cluster.map((s) => extractRegion(s.location)))];
    const count = cluster.length;
    const severity = severityFromCount(count);

    alerts.push({
      id: `alert-${seed.disease}-${Math.round(center.lat * 100)}-${Math.round(center.lng * 100)}`,
      disease: seed.disease,
      cropTypes: crops,
      scanCount: count,
      radiusKm,
      centerLat: center.lat,
      centerLng: center.lng,
      severity,
      message: alertMessage(seed.disease, count, radiusKm, crops),
      regionLabel: regions.filter((r) => r !== 'Unknown').join(', ') || regions[0],
      active: true,
      detectedAt: cluster.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0].timestamp,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return alerts.sort((a, b) => b.scanCount - a.scanCount);
}

/** Cluster chat questions into regional knowledge gap reports */
export function aggregateKnowledgeGaps(questions: ChatQuestionRecord[]): KnowledgeGapReport[] {
  const map = new Map<string, KnowledgeGapReport>();
  const reportDate = new Date().toISOString().slice(0, 10);

  for (const q of questions) {
    const topic = extractChatTopic(q.question);
    const region = extractRegion(q.location);
    const key = `${topic}::${region}`;
    const entry = map.get(key) ?? {
      id: `gap-${topic}-${region}`.replace(/\s+/g, '-').toLowerCase(),
      topic,
      region,
      questionCount: 0,
      sampleQuestion: q.question,
      priority: 'low' as const,
      locations: [],
      reportDate,
    };
    entry.questionCount += 1;
    if (!entry.locations.includes(q.location)) entry.locations.push(q.location);
    map.set(key, entry);
  }

  return Array.from(map.values())
    .filter((g) => g.questionCount >= 2)
    .map((g) => ({ ...g, priority: priorityFromCount(g.questionCount) }))
    .sort((a, b) => b.questionCount - a.questionCount);
}

function monthFromDate(isoDate: string): string {
  const idx = new Date(isoDate).getMonth();
  return MONTH_NAMES[idx] ?? 'Unknown';
}

function optimalMonthsForCrop(cropName: string): string[] {
  const entry = (plantationDataset as { crop_name: string; planting_window: string[] }[]).find(
    (c) => c.crop_name.toLowerCase() === cropName.toLowerCase(),
  );
  return entry?.planting_window ?? [];
}

function buildPlantingRecommendation(
  cropName: string,
  region: string,
  optimal: string[],
  observed: string[],
  avgTemp?: number,
): string {
  const overlap = observed.filter((m) => optimal.includes(m));
  if (overlap.length > 0) {
    return `${cropName} in ${region}: ${overlap.join(', ')} align with optimal windows. ${avgTemp != null ? `Avg temp ${Math.round(avgTemp)}°C supports planting.` : ''}`.trim();
  }
  if (optimal.length > 0) {
    return `${cropName} in ${region}: consider shifting plantings to ${optimal.slice(0, 3).join(', ')} based on regional calendar data.`;
  }
  return `${cropName} in ${region}: monitor local weather before planting.`;
}

/** Aggregate calendar + weather into planting window insights */
export function aggregatePlantingInsights(
  farming: FarmingDataRecord[],
  weatherLogs: EnvironmentLogRecord[],
): PlantingWindowInsight[] {
  const reportDate = new Date().toISOString().slice(0, 10);
  const map = new Map<string, PlantingWindowInsight>();

  for (const record of farming) {
    const region = extractRegion(record.location);
    const key = `${record.cropName}::${region}`;
    const month = monthFromDate(record.plantDate);
    const entry = map.get(key) ?? {
      id: `plant-${record.cropName}-${region}`.replace(/\s+/g, '-').toLowerCase(),
      cropName: record.cropName,
      region,
      optimalMonths: optimalMonthsForCrop(record.cropName),
      observedPlantMonths: [],
      farmerCount: 0,
      recommendation: '',
      reportDate,
    };
    if (!entry.observedPlantMonths.includes(month)) {
      entry.observedPlantMonths.push(month);
    }
    entry.farmerCount += 1;
    map.set(key, entry);
  }

  const weatherByRegion = new Map<string, { temps: number[]; humidity: number[] }>();
  for (const log of weatherLogs) {
    const region = extractRegion(log.location);
    const bucket = weatherByRegion.get(region) ?? { temps: [], humidity: [] };
    bucket.temps.push(log.temperature);
    bucket.humidity.push(log.humidity);
    weatherByRegion.set(region, bucket);
  }

  return Array.from(map.values())
    .filter((i) => i.farmerCount >= 1)
    .map((insight) => {
      const weather = weatherByRegion.get(insight.region);
      const avgTemperature = weather
        ? Math.round(weather.temps.reduce((a, b) => a + b, 0) / weather.temps.length)
        : undefined;
      const avgHumidity = weather
        ? Math.round(weather.humidity.reduce((a, b) => a + b, 0) / weather.humidity.length)
        : undefined;
      return {
        ...insight,
        avgTemperature,
        avgHumidity,
        recommendation: buildPlantingRecommendation(
          insight.cropName,
          insight.region,
          insight.optimalMonths,
          insight.observedPlantMonths,
          avgTemperature,
        ),
      };
    })
    .sort((a, b) => b.farmerCount - a.farmerCount);
}

/** Build full regional intelligence from raw collected data */
export function buildRegionalIntelligence(input: {
  scans: CropScanRecord[];
  questions: ChatQuestionRecord[];
  farming: FarmingDataRecord[];
  weatherLogs: EnvironmentLogRecord[];
}): RegionalIntelligence {
  return {
    diseaseAlerts: aggregateDiseaseAlerts(input.scans),
    knowledgeGaps: aggregateKnowledgeGaps(input.questions),
    plantingInsights: aggregatePlantingInsights(input.farming, input.weatherLogs),
    lastAggregatedAt: new Date().toISOString(),
  };
}

/** Find active alerts near a farmer (privacy-safe — no individual scan data exposed) */
export function getAlertsNearFarmer(
  alerts: DiseaseAlert[],
  userLat?: number,
  userLng?: number,
  location?: string,
  maxKm = DEFAULT_ALERT_RADIUS_KM,
): DiseaseAlert[] {
  const coords = resolveCoordinates(location, userLat, userLng);
  if (!coords) return [];

  return alerts
    .filter((a) => a.active)
    .filter((a) => distanceKm(coords.lat, coords.lng, a.centerLat, a.centerLng) <= maxKm + a.radiusKm)
    .sort((a, b) => b.scanCount - a.scanCount);
}
