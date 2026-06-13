import type {
  DiseaseAlert,
  KnowledgeGapReport,
  PlantingWindowInsight,
  RegionalIntelligence,
} from '../../types/analytics';
import type {
  DbDiseaseAlert,
  DbKnowledgeGapReport,
  DbPlantingInsight,
} from '../../types/database';
import { isSupabaseConfigured, getSupabase } from '../supabase/client';

function dbAlertToAlert(row: DbDiseaseAlert): DiseaseAlert {
  return {
    id: row.id,
    disease: row.disease,
    cropTypes: row.crop_types ?? [],
    scanCount: row.scan_count,
    radiusKm: row.radius_km,
    centerLat: row.center_lat,
    centerLng: row.center_lng,
    severity: row.severity,
    message: row.message,
    regionLabel: row.region_label ?? undefined,
    active: row.active,
    detectedAt: row.detected_at,
    expiresAt: row.expires_at ?? undefined,
  };
}

function dbGapToReport(row: DbKnowledgeGapReport): KnowledgeGapReport {
  return {
    id: row.id,
    topic: row.topic,
    region: row.region,
    questionCount: row.question_count,
    sampleQuestion: row.sample_question,
    priority: row.priority,
    locations: row.locations ?? [],
    reportDate: row.report_date,
  };
}

function dbInsightToWindow(row: DbPlantingInsight): PlantingWindowInsight {
  return {
    id: row.id,
    cropName: row.crop_name,
    region: row.region,
    optimalMonths: row.optimal_months ?? [],
    observedPlantMonths: row.observed_plant_months ?? [],
    farmerCount: row.farmer_count,
    avgTemperature: row.avg_temperature ?? undefined,
    avgHumidity: row.avg_humidity ?? undefined,
    recommendation: row.recommendation,
    reportDate: row.report_date,
  };
}

/** Fetch pre-computed intelligence from Supabase (populated by nightly Edge Function) */
export async function fetchCloudRegionalIntelligence(): Promise<RegionalIntelligence | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = getSupabase();
  if (!sb) return null;

  const today = new Date().toISOString().slice(0, 10);

  const [alertsRes, gapsRes, plantingRes] = await Promise.allSettled([
    sb
      .from('disease_alerts')
      .select('*')
      .eq('active', true)
      .order('scan_count', { ascending: false })
      .limit(50),
    sb
      .from('knowledge_gap_reports')
      .select('*')
      .eq('report_date', today)
      .order('question_count', { ascending: false })
      .limit(50),
    sb
      .from('planting_insights')
      .select('*')
      .eq('report_date', today)
      .order('farmer_count', { ascending: false })
      .limit(50),
  ]);

  const alerts =
    alertsRes.status === 'fulfilled' && !alertsRes.value.error
      ? ((alertsRes.value.data ?? []) as DbDiseaseAlert[])
      : [];
  const gaps =
    gapsRes.status === 'fulfilled' && !gapsRes.value.error
      ? ((gapsRes.value.data ?? []) as DbKnowledgeGapReport[])
      : [];
  const planting =
    plantingRes.status === 'fulfilled' && !plantingRes.value.error
      ? ((plantingRes.value.data ?? []) as DbPlantingInsight[])
      : [];

  if (alerts.length === 0 && gaps.length === 0 && planting.length === 0) {
    return null;
  }

  return {
    diseaseAlerts: alerts.map(dbAlertToAlert),
    knowledgeGaps: gaps.map(dbGapToReport),
    plantingInsights: planting.map(dbInsightToWindow),
    lastAggregatedAt: new Date().toISOString(),
  };
}

/** Fetch disease alerts near a farmer using PostGIS RPC */
export async function fetchAlertsNearFarmer(
  lat: number,
  lng: number,
  maxKm = 50,
): Promise<DiseaseAlert[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb.rpc('disease_alerts_near', {
    farmer_lat: lat,
    farmer_lng: lng,
    max_km: maxKm,
  });

  if (error) {
    console.warn('[Verdora] disease_alerts_near RPC:', error.message);
    return [];
  }

  return ((data ?? []) as DbDiseaseAlert[]).map(dbAlertToAlert);
}
