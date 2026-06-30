import type { User } from '../../../types';
import type { DbUser, InsertDbUser } from '../../../types/database';
import { getUserLocationDisplay } from '../../../utils/locationHelpers';
import { getSupabase, isSupabaseConfigured } from '../client';

export function dbUserToUser(row: DbUser): User {
  const user: User = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    locationLegacy: row.location_legacy ?? undefined,
    regionId: row.region_id ?? undefined,
    regionName: row.region_name ?? undefined,
    townId: row.town_id ?? undefined,
    townName: row.town_name ?? undefined,
    constituency: row.constituency ?? undefined,
    isCustomTown: row.is_custom_town,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    farmSize: row.farm_size ?? undefined,
    farmerType: row.farmer_type ?? undefined,
    cropsPlanted: row.crop_preferences ?? [],
    cropPreferences: row.crop_preferences ?? [],
    soilType: row.soil_type ?? undefined,
    farmingMethods: row.farming_methods ?? [],
    dataConsent: row.data_consent,
    dataConsentAt: row.data_consent_at ?? undefined,
    isActive: row.is_active ?? true,
    createdAt: row.created_at,
  };
  user.location = getUserLocationDisplay(user);
  if (user.regionName) user.region = user.regionName;
  if (user.townName) user.village = user.townName;
  return user;
}

export function userToDbRow(user: User, dataConsent: boolean): InsertDbUser {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location_legacy: user.locationLegacy ?? null,
    region_id: user.regionId ?? null,
    region_name: user.regionName ?? null,
    town_id: user.townId ?? null,
    town_name: user.townName ?? null,
    constituency: user.constituency ?? null,
    is_custom_town: user.isCustomTown ?? false,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    farm_size: user.farmSize ?? null,
    farmer_type: user.farmerType ?? null,
    crop_preferences: user.cropsPlanted ?? user.cropPreferences ?? [],
    soil_type: user.soilType ?? null,
    farming_methods: user.farmingMethods ?? [],
    data_consent: dataConsent,
    data_consent_at: dataConsent ? now : null,
    is_active: user.isActive !== false,
    created_at: user.createdAt ?? now,
    updated_at: now,
  };
}

export async function upsertUser(user: User, dataConsent: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row = userToDbRow(user, dataConsent);
  let { error } = await sb.from('users').upsert(row, { onConflict: 'id' });

  if (error?.message?.includes('is_active')) {
    const { is_active: _ignored, ...legacyRow } = row;
    const retry = await sb.from('users').upsert(legacyRow, { onConflict: 'id' });
    error = retry.error;
  }

  if (error) console.warn('[Verdora] Supabase users upsert:', error.message);
}

export async function updateUserConsent(
  userId: string,
  dataConsent: boolean,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb
    .from('users')
    .update({
      data_consent: dataConsent,
      data_consent_at: dataConsent ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) console.warn('[Verdora] Supabase consent update:', error.message);
}

export async function fetchUserById(userId: string): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const { data, error } = await sb.from('users').select('*').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return dbUserToUser(data as DbUser);
}

export async function fetchAllUsers(): Promise<DbUser[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb.from('users').select('*').order('created_at', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as import('../../../types/database').DbUser[];
}

export async function setUserActiveStatus(userId: string, isActive: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured');

  const { error } = await sb
    .from('users')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export function isCloudEnabled(): boolean {
  return isSupabaseConfigured();
}
