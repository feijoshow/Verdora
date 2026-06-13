import type { RegionalIntelligence } from '../../types/analytics';
import type { User } from '../../types';
import { ensureDemoIntelligenceSeed } from '../../data/demoIntelligenceSeed';
import { env } from '../../config/env';
import {
  buildRegionalIntelligence,
  getAlertsNearFarmer,
} from './aggregationEngine';
import {
  fetchAlertsNearFarmer,
  fetchCloudRegionalIntelligence,
} from '../supabase/intelligenceRepository';
import { loadFullAnalyticsDatabase } from '../analytics/dataCollectionService';

/** Get regional intelligence — cloud pre-computed first, then live local aggregation */
export async function getRegionalIntelligence(): Promise<RegionalIntelligence> {
  if (env.useMockApi) {
    await ensureDemoIntelligenceSeed();
  }

  try {
    const cloud = await fetchCloudRegionalIntelligence();
    if (cloud && (cloud.diseaseAlerts.length > 0 || cloud.knowledgeGaps.length > 0)) {
      return cloud;
    }
  } catch (e) {
    console.warn('[Verdora] Cloud intelligence fallback to local:', e);
  }

  const db = await loadFullAnalyticsDatabase();
  return buildRegionalIntelligence({
    scans: db.cropScans,
    questions: db.chatQuestions,
    farming: db.farmingRecords,
    weatherLogs: db.environmentLogs,
  });
}

/** Privacy-safe nearby outbreak alerts for a farmer */
export async function getFarmerNearbyAlerts(user: User): Promise<RegionalIntelligence['diseaseAlerts']> {
  if (user.latitude != null && user.longitude != null) {
    try {
      const rpcAlerts = await fetchAlertsNearFarmer(user.latitude, user.longitude);
      if (rpcAlerts.length > 0) return rpcAlerts;
    } catch {
      // fall through to local
    }
  }

  const intelligence = await getRegionalIntelligence();
  return getAlertsNearFarmer(
    intelligence.diseaseAlerts,
    user.latitude,
    user.longitude,
    user.location,
  );
}
