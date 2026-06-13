import type { FarmField } from '../../../types/field';
import type { DbField, InsertDbField } from '../../../types/database';
import { getSupabase } from '../client';

export function fieldToDbRow(field: FarmField): InsertDbField {
  return {
    id: field.id,
    user_id: field.userId,
    name: field.name,
    latitude: field.latitude ?? null,
    longitude: field.longitude ?? null,
    sort_order: field.sortOrder,
  };
}

export function dbFieldToFarmField(row: DbField): FarmField {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

export async function upsertField(field: FarmField): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const row = { ...fieldToDbRow(field), updated_at: new Date().toISOString() };
  const { error } = await sb.from('fields').upsert(row, { onConflict: 'id' });
  if (error) console.warn('[Verdora] Supabase fields upsert:', error.message);
}

export async function deleteField(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from('fields').delete().eq('id', id);
  if (error) console.warn('[Verdora] Supabase fields delete:', error.message);
}

export async function fetchFieldsByUser(userId: string): Promise<FarmField[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('fields')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('[Verdora] Supabase fields fetch:', error.message);
    return [];
  }
  return (data ?? []).map((row) => dbFieldToFarmField(row as DbField));
}
