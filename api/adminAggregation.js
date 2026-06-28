/**
 * Server-side insight aggregation — mirrors nightly-aggregation Edge Function.
 */

const ALERT_RADIUS_KM = 50;
const MIN_SCANS_FOR_ALERT = 3;
const LOOKBACK_DAYS = 30;

function distanceKm(lat1, lng1, lat2, lng2) {
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

function extractRegion(location) {
  if (!location?.trim()) return 'Unknown';
  const parts = location.split(',').map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 1] : parts[0];
}

function extractChatTopic(question) {
  const q = question.toLowerCase();
  if (q.includes('nitrogen') || q.includes('npk') || q.includes('nutrient')) return 'Fertilizer & nutrients';
  if (q.includes('fertiliz')) return 'Fertilizer & nutrients';
  if (q.includes('weather') || q.includes('rain')) return 'Weather & planting timing';
  if (q.includes('plant') || q.includes('when')) return 'Planting schedules';
  return 'General farming advice';
}

function severity(count) {
  if (count >= 15) return 'critical';
  if (count >= 8) return 'high';
  if (count >= 5) return 'medium';
  return 'low';
}

export function clusterDiseaseAlerts(scans) {
  const cutoff = Date.now() - LOOKBACK_DAYS * 86400000;
  const geo = scans.filter(
    (s) => s.disease && s.latitude != null && s.longitude != null && new Date(s.scanned_at).getTime() >= cutoff,
  );
  const alerts = [];
  const used = new Set();

  for (const seed of geo) {
    if (used.has(seed.id) || !seed.disease) continue;
    const cluster = geo.filter(
      (s) =>
        s.disease === seed.disease &&
        !used.has(s.id) &&
        distanceKm(seed.latitude, seed.longitude, s.latitude, s.longitude) <= ALERT_RADIUS_KM,
    );
    if (cluster.length < MIN_SCANS_FOR_ALERT) continue;
    cluster.forEach((s) => used.add(s.id));

    const centerLat = cluster.reduce((sum, c) => sum + c.latitude, 0) / cluster.length;
    const centerLng = cluster.reduce((sum, c) => sum + c.longitude, 0) / cluster.length;
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

export function aggregateKnowledgeGaps(chatLogs, reportDate) {
  const map = new Map();
  for (const row of chatLogs) {
    const topic = extractChatTopic(row.question);
    const region = extractRegion(row.location);
    const key = `${topic}::${region}`;
    const entry = map.get(key) ?? {
      id: `gap-${topic}-${region}-${reportDate}`.replace(/\s+/g, '-').toLowerCase(),
      topic,
      region,
      question_count: 0,
      sample_question: row.question,
      priority: 'low',
      locations: [],
      report_date: reportDate,
    };
    entry.question_count += 1;
    if (!entry.locations.includes(region)) entry.locations.push(region);
    map.set(key, entry);
  }
  return Array.from(map.values())
    .filter((g) => g.question_count >= 2)
    .map((g) => ({
      ...g,
      priority: g.question_count >= 8 ? 'high' : g.question_count >= 4 ? 'medium' : 'low',
    }));
}

export function aggregatePlanting(crops, weatherLogs, reportDate) {
  const map = new Map();
  for (const crop of crops) {
    const region = extractRegion(crop.location);
    const key = `${crop.crop_name}::${region}`;
    const month = new Date(crop.plant_date).toLocaleString('en', { month: 'long' });
    const entry = map.get(key) ?? {
      id: `plant-${crop.crop_name}-${region}-${reportDate}`.replace(/\s+/g, '-').toLowerCase(),
      crop_name: crop.crop_name,
      region,
      optimal_months: [],
      observed_plant_months: [],
      farmer_count: 0,
      recommendation: '',
      report_date: reportDate,
    };
    if (!entry.observed_plant_months.includes(month)) entry.observed_plant_months.push(month);
    entry.farmer_count += 1;
    map.set(key, entry);
  }

  const weatherByRegion = new Map();
  for (const log of weatherLogs) {
    const region = extractRegion(log.location);
    const bucket = weatherByRegion.get(region) ?? { temps: [], humidity: [] };
    bucket.temps.push(log.temperature);
    bucket.humidity.push(log.humidity);
    weatherByRegion.set(region, bucket);
  }

  return Array.from(map.values()).map((insight) => {
    const weather = weatherByRegion.get(insight.region);
    const avgTemperature = weather
      ? Math.round(weather.temps.reduce((a, b) => a + b, 0) / weather.temps.length)
      : null;
    const avgHumidity = weather
      ? Math.round(weather.humidity.reduce((a, b) => a + b, 0) / weather.humidity.length)
      : null;
    return {
      ...insight,
      avg_temperature: avgTemperature,
      avg_humidity: avgHumidity,
      recommendation: `Track ${insight.crop_name} planting in ${insight.region} — ${insight.farmer_count} farmer(s) planted in ${insight.observed_plant_months.join(', ') || 'various months'}.`,
    };
  });
}

export async function runInsightAggregation(sb) {
  const reportDate = new Date().toISOString().slice(0, 10);
  const runId = `run-${Date.now()}`;

  await sb.from('aggregation_runs').insert({
    id: runId,
    run_type: 'manual',
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

    const alerts = clusterDiseaseAlerts(scansRes.data ?? []);
    const gaps = aggregateKnowledgeGaps(chatRes.data ?? [], reportDate);
    const planting = aggregatePlanting(cropsRes.data ?? [], weatherRes.data ?? [], reportDate);

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

    return {
      alerts: alerts.length,
      gaps: gaps.length,
      planting: planting.length,
      lastAggregatedAt: new Date().toISOString(),
      diseaseAlerts: alerts.map((a) => ({
        id: a.id,
        disease: a.disease,
        cropTypes: a.crop_types,
        scanCount: a.scan_count,
        radiusKm: a.radius_km,
        centerLat: a.center_lat,
        centerLng: a.center_lng,
        severity: a.severity,
        message: a.message,
        regionLabel: a.region_label,
        active: true,
        detectedAt: a.detected_at,
        expiresAt: a.expires_at,
      })),
      knowledgeGaps: gaps.map((g) => ({
        id: g.id,
        topic: g.topic,
        region: g.region,
        questionCount: g.question_count,
        sampleQuestion: g.sample_question,
        priority: g.priority,
        locations: g.locations,
        reportDate: g.report_date,
      })),
      plantingInsights: planting.map((p) => ({
        id: p.id,
        cropName: p.crop_name,
        region: p.region,
        optimalMonths: p.optimal_months,
        observedPlantMonths: p.observed_plant_months,
        farmerCount: p.farmer_count,
        avgTemperature: p.avg_temperature ?? undefined,
        avgHumidity: p.avg_humidity ?? undefined,
        recommendation: p.recommendation,
        reportDate: p.report_date,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from('aggregation_runs')
      .update({ status: 'failed', error_message: message, finished_at: new Date().toISOString() })
      .eq('id', runId);
    throw err;
  }
}
