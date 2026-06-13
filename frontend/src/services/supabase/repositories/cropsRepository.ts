import type { PlantingEvent, User } from '../../../types';
import type { DbCrop, InsertDbCrop } from '../../../types/database';
import { getSupabase } from '../client';

export function eventToCropRow(
  user: User,
  event: PlantingEvent,
  extras?: { soilType?: string; farmingMethods?: string[] },
): InsertDbCrop {
  return {
    id: event.id,
    user_id: user.id,
    crop_name: event.cropName,
    plant_date: event.plantDate,
    harvest_date: event.harvestDate ?? null,
    location: user.location ?? null,
    field_name: event.fieldName ?? null,
    field_id: event.fieldId ?? null,
    soil_type: extras?.soilType ?? user.soilType ?? null,
    farming_methods: extras?.farmingMethods ?? user.farmingMethods ?? [],
    notes: event.notes ?? null,
  };
}

export async function upsertCrop(
  user: User,
  event: PlantingEvent,
  extras?: { soilType?: string; farmingMethods?: string[] },
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row = { ...eventToCropRow(user, event, extras), updated_at: new Date().toISOString() };
  const { error } = await sb.from('crops').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[Verdora] Supabase crops upsert:', error.message);
}

export async function deleteCrop(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from('crops').delete().eq('id', id);
}

export async function fetchAllCrops(): Promise<DbCrop[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb.from('crops').select('*').order('plant_date', {
    ascending: false,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbCrop[];
}

export async function fetchCropsByUser(userId: string): Promise<DbCrop[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('crops')
    .select('*')
    .eq('user_id', userId)
    .order('plant_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as DbCrop[];
}
