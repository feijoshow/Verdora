/**
 * Nightly aggregation Edge Function — clusters disease scans, knowledge gaps, planting insights.
 * Deploy: supabase functions deploy nightly-aggregation
 * Schedule: supabase functions schedule create nightly-aggregation --cron "0 2 * * *"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALERT_RADIUS_KM = 50;
const MIN_SCANS_FOR_ALERT = 3;
const LOOKBACK_DAYS = 30;

interface ScanRow {
  id: string;
  disease: string | null;
  crop_type: string;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  scanned_at: string;
}

interface ChatRow {
  id: string;
  question: string;
  location: string | null;
}

interface CropRow {
  crop_name: string;
  plant_date: string;
  location: string | null;
  user_id: string;
}

interface WeatherRow {
  location: string;
  temperature: number;
  humidity: number;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractRegion(location?: string | null): string {
  if (!location?.trim()) return 'Unknown';
  const parts = location.split(',').map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 1] : parts[0];
}

function extractChatTopic(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('nitrogen') || q.includes('npk') || q.includes('nutrient')) return 'Fertilizer & nutrients';
  if (q.includes('fertiliz')) return 'Fertilizer & nutrients';
  if (q.includes('weather') || q.includes('rain')) return 'Weather & planting timing';
  if (q.includes('plant') || q.includes('when')) return 'Planting schedules';
  return 'General farming advice';
}

function severity(count: number): string {
  if (count >= 15) return 'critical';
  if (count >= 8) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

function clusterDiseaseAlerts(scans: ScanRow[]) {
  const cutoff = Date.now() - LOOKBACK_DAYS * 86400000;
  const geo = scans.filter(
    (s) => s.disease && s.latitude != null && s.longitude != null && new Date(s.scanned_at).getTime() >= cutoff,
  );
  const alerts: Record<string, unknown>[] = [];
  const used = new Set<string>();

  for (const seed of geo) {
    if (used.has(seed.id) || !seed.disease) continue;
    const cluster = geo.filter(
      (s) =>
        s.disease === seed.disease &&
        !used.has(s.id) &&
        distanceKm(seed.latitude!, seed.longitude!, s.latitude!, s.longitude!) <= ALERT_RADIUS_KM,
    );
    if (cluster.length < MIN_SCANS_FOR_ALERT) continue;
    cluster.forEach((s) => used.add(s.id));

    const centerLat = cluster.reduce((s, c) => s + c.latitude!, 0) / cluster.length;
    const centerLng = cluster.reduce((s, c) => s + c.longitude!, 0) / cluster.length;
    const crops = [...new Set(cluster.map((c) => c.crop_type))];
    const regions = [...new Set(cluster.map((c) => extractRegion(c.location)))];
    const count = cluster.length;
    const disease = seed.disease;

    alerts.push({
      id: `alert-${disease}-${Math.round(centerLat * 100)}-${Math.round(centerLng * 100)}`,
      disease,
      crop_types: crops,
      scan_count: count,
      radius_km: ALERT_RADIUS_KM,
      center_lat: centerLat,
      center_lng: centerLng,
      severity: severity(count),
      message: `${disease} detected in ${count} scans within ${ALERT_RADIUS_KM} km — crops: ${crops.join(', ')}`,
      region_label: regions.filter((r) => r !== 'Unknown').join(', ') || regions[0],
      active: true,
      detected_at: cluster.sort((a, b) => b.scanned_at.localeCompare(a.scanned_at))[0].scanned_at,
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  return alerts;
}

function aggregateKnowledgeGaps(logs: ChatRow[], reportDate: string) {
  const map = new Map<string, Record<string, unknown>>();
  for (const log of logs) {
    const topic = extractChatTopic(log.question);
    const region = extractRegion(log.location);
    const key = `${topic}::${region}`;
    const entry = map.get(key) ?? {
      id: `gap-${topic}-${region}`.replace(/\s+/g, '-').toLowerCase(),
      topic,
      region,
      question_count: 0,
      sample_question: log.question,
      priority: 'low',
      locations: [] as string[],
      report_date: reportDate,
      updated_at: new Date().toISOString(),
    };
    entry.question_count = (entry.question_count as number) + 1;
    const locs = entry.locations as string[];
    const loc = log.location ?? 'Unknown';
    if (!locs.includes(loc)) locs.push(loc);
    map.set(key, entry);
  }
  return Array.from(map.values())
    .filter((g) => (g.question_count as number) >= 2)
    .map((g) => ({
      ...g,
      priority: (g.question_count as number) >= 20 ? 'high' : (g.question_count as number) >= 5 ? 'medium' : 'low',
    }));
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function aggregatePlanting(crops: CropRow[], weather: WeatherRow[], reportDate: string) {
  const map = new Map<string, Record<string, unknown>>();
  for (const c of crops) {
    const region = extractRegion(c.location);
    const key = `${c.crop_name}::${region}`;
    const month = MONTHS[new Date(c.plant_date).getMonth()] ?? 'Unknown';
    const entry = map.get(key) ?? {
      id: `plant-${c.crop_name}-${region}`.replace(/\s+/g, '-').toLowerCase(),
      crop_name: c.crop_name,
      region,
      optimal_months: [] as string[],
      observed_plant_months: [] as string[],
      farmer_count: 0,
      recommendation: '',
      report_date: reportDate,
      updated_at: new Date().toISOString(),
    };
    const months = entry.observed_plant_months as string[];
    if (!months.includes(month)) months.push(month);
    entry.farmer_count = (entry.farmer_count as number) + 1;
    map.set(key, entry);
  }

  const weatherByRegion = new Map<string, { temps: number[]; humidity: number[] }>();
  for (const w of weather) {
    const region = extractRegion(w.location);
    const b = weatherByRegion.get(region) ?? { temps: [], humidity: [] };
    b.temps.push(w.temperature);
    b.humidity.push(w.humidity);
    weatherByRegion.set(region, b);
  }

  return Array.from(map.values()).map((insight) => {
    const region = insight.region as string;
    const crop = insight.crop_name as string;
    const w = weatherByRegion.get(region);
    const avgTemp = w ? Math.round(w.temps.reduce((a, b) => a + b, 0) / w.temps.length) : null;
    const avgHum = w ? Math.round(w.humidity.reduce((a, b) => a + b, 0) / w.humidity.length) : null;
    const observed = (insight.observed_plant_months as string[]).join(', ');
    return {
      ...insight,
      avg_temperature: avgTemp,
      avg_humidity: avgHum,
      recommendation: `${crop} in ${region}: observed plantings in ${observed}.${avgTemp != null ? ` Avg ${avgTemp}°C.` : ''}`,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceKey);

  const runId = `run-${Date.now()}`;
  const reportDate = new Date().toISOString().slice(0, 10);

  await sb.from('aggregation_runs').insert({
    id: runId,
    run_type: 'nightly',
    status: 'running',
    started_at: new Date().toISOString(),
  });

  try {
    const [scansRes, chatRes, cropsRes, weatherRes] = await Promise.all([
      sb.from('scans').select('*').not('disease', 'is', null),
      sb.from('chat_logs').select('*'),
      sb.from('crops').select('*'),
      sb.from('weather_logs').select('*').limit(1000),
    ]);

    const alerts = clusterDiseaseAlerts((scansRes.data ?? []) as ScanRow[]);
    const gaps = aggregateKnowledgeGaps((chatRes.data ?? []) as ChatRow[], reportDate);
    const planting = aggregatePlanting(
      (cropsRes.data ?? []) as CropRow[],
      (weatherRes.data ?? []) as WeatherRow[],
      reportDate,
    );

    await sb.from('disease_alerts').update({ active: false }).eq('active', true);
    if (alerts.length > 0) {
      await sb.from('disease_alerts').upsert(alerts);
    }

    if (gaps.length > 0) {
      await sb.from('knowledge_gap_reports').upsert(gaps, { onConflict: 'topic,region,report_date' });
    }

    if (planting.length > 0) {
      await sb.from('planting_insights').upsert(planting, { onConflict: 'crop_name,region,report_date' });
    }

    await sb
      .from('aggregation_runs')
      .update({
        status: 'success',
        alerts_created: alerts.length,
        gaps_created: gaps.length,
        planting_insights_created: planting.length,
        finished_at: new Date().toISOString(),
      })
      .eq('id', runId);

    return new Response(
      JSON.stringify({
        ok: true,
        alerts: alerts.length,
        gaps: gaps.length,
        planting: planting.length,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from('aggregation_runs')
      .update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() })
      .eq('id', runId);

    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
