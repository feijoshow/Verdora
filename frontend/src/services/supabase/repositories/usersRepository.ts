import type { User } from '../../../types';
import type { DbUser, InsertDbUser } from '../../../types/database';
import { getSupabase, isSupabaseConfigured } from '../client';

export function dbUserToUser(row: DbUser): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    location: row.location ?? undefined,
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
    createdAt: row.created_at,
  };
}

export function userToDbRow(user: User, dataConsent: boolean): InsertDbUser {
  const now = new Date().toISOString();
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    location: user.location ?? null,
    latitude: user.latitude ?? null,
    longitude: user.longitude ?? null,
    farm_size: user.farmSize ?? null,
    farmer_type: user.farmerType ?? null,
    crop_preferences: user.cropsPlanted ?? user.cropPreferences ?? [],
    soil_type: user.soilType ?? null,
    farming_methods: user.farmingMethods ?? [],
    data_consent: dataConsent,
    data_consent_at: dataConsent ? now : null,
    created_at: user.createdAt ?? now,
    updated_at: now,
  };
}

export async function upsertUser(user: User, dataConsent: boolean): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row = userToDbRow(user, dataConsent);
  const { error } = await sb.from('users').upsert(row, { onConflict: 'id' });
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

export function isCloudEnabled(): boolean {
  return isSupabaseConfigured();
}
