import type { DiagnosisResult, PlantingEvent, User } from '../../../types';
import type { FarmField } from '../../../types/field';
import type { InsertDbScan } from '../../../types/database';
import { getSupabase } from '../client';

export interface ScanFieldContext {
  fieldId?: string;
  fieldName?: string;
  latitude?: number;
  longitude?: number;
}

export function diagnosisToScanRow(
  user: User,
  diagnosis: DiagnosisResult,
  field?: ScanFieldContext,
): InsertDbScan {
  const lat = field?.latitude ?? user.latitude;
  const lng = field?.longitude ?? user.longitude;

  return {
    id: diagnosis.id,
    user_id: user.id,
    image_url: diagnosis.imageUri ?? null,
    crop_type: diagnosis.cropName,
    disease: diagnosis.disease,
    confidence: diagnosis.confidence,
    treatment: diagnosis.treatment,
    location: field?.fieldName ?? user.location ?? null,
    field_id: field?.fieldId ?? diagnosis.fieldId ?? null,
    field_name: field?.fieldName ?? diagnosis.fieldName ?? null,
    latitude: lat ?? null,
    longitude: lng ?? null,
    scanned_at: diagnosis.scannedAt,
  };
}

export async function insertScan(
  user: User,
  diagnosis: DiagnosisResult,
  field?: ScanFieldContext,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.from('scans').insert(diagnosisToScanRow(user, diagnosis, field));
  if (error) console.warn('[Verdora] Supabase scans insert:', error.message);
}

export async function fetchAllScans(): Promise<import('../../../types/database').DbScan[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('scans')
    .select('*')
    .order('scanned_at', { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as import('../../../types/database').DbScan[];
}

export async function fetchScansByUser(userId: string): Promise<import('../../../types/database').DbScan[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('scanned_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as import('../../../types/database').DbScan[];
}

export function fieldCoords(field: FarmField | null | undefined): ScanFieldContext | undefined {
  if (!field) return undefined;
  return {
    fieldId: field.id,
    fieldName: field.name,
    latitude: field.latitude,
    longitude: field.longitude,
  };
}
