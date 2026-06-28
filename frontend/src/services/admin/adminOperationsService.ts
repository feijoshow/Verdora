import { hasAiApi } from '../../config/env';
import type { RegionalIntelligence } from '../../types/analytics';
import {
  regenerateAdminInsights,
  removeLocalUserAccount,
  setLocalUserActiveStatus,
} from '../analytics/dataCollectionService';
import { isSupabaseConfigured } from '../supabase/client';
import { setUserActiveStatus } from '../supabase/repositories/usersRepository';
import { aiApiClient, aiApiPost } from '../api/client';

export interface RegenerateInsightsResult {
  regionalIntelligence: RegionalIntelligence;
  alerts: number;
  gaps: number;
  planting: number;
  source: 'cloud' | 'local';
}

export async function regenerateInsights(): Promise<RegenerateInsightsResult> {
  if (hasAiApi) {
    try {
      return await aiApiPost<RegenerateInsightsResult>('/api/v1/admin/regenerate-insights');
    } catch (err) {
      console.warn('[Verdora] Cloud regenerate failed, using local:', err);
    }
  }

  const insights = await regenerateAdminInsights();
  return {
    regionalIntelligence: insights.regionalIntelligence,
    alerts: insights.regionalIntelligence.diseaseAlerts.length,
    gaps: insights.regionalIntelligence.knowledgeGaps.length,
    planting: insights.regionalIntelligence.plantingInsights.length,
    source: 'local',
  };
}

export async function setFarmerAccountActive(userId: string, isActive: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    await setUserActiveStatus(userId, isActive);
  }
  await setLocalUserActiveStatus(userId, isActive);

  if (hasAiApi) {
    try {
      await aiApiClient.patch(`/api/v1/admin/users/${userId}/status`, { isActive });
    } catch {
      // Local/Supabase update already applied
    }
  }
}

export async function deleteFarmerAccount(userId: string): Promise<void> {
  if (hasAiApi) {
    await aiApiClient.delete(`/api/v1/admin/users/${userId}`);
  } else if (isSupabaseConfigured()) {
    throw new Error(
      'Account deletion requires the Verdora API server. Start api with npm run api:dev and set EXPO_PUBLIC_AI_API_URL.',
    );
  }

  await removeLocalUserAccount(userId);
}
