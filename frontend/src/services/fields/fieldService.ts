import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FarmField } from '../../types/field';
import { MAX_FARM_FIELDS } from '../../constants/fields';
import { mockId } from '../mocks/mockUtils';
import {
  deleteField as deleteCloudField,
  fetchFieldsByUser,
  upsertField,
} from '../supabase/repositories/fieldsRepository';
import { isSupabaseConfigured } from '../supabase/client';

const fieldsKey = (userId: string) => `@verdora_fields_${userId}`;
const lastFieldKey = (userId: string) => `@verdora_last_field_${userId}`;

async function loadLocalFields(userId: string): Promise<FarmField[]> {
  const raw = await AsyncStorage.getItem(fieldsKey(userId));
  return raw ? (JSON.parse(raw) as FarmField[]) : [];
}

async function saveLocalFields(userId: string, fields: FarmField[]): Promise<void> {
  await AsyncStorage.setItem(fieldsKey(userId), JSON.stringify(fields));
}

function mergeFields(local: FarmField[], cloud: FarmField[]): FarmField[] {
  const map = new Map<string, FarmField>();
  for (const f of cloud) map.set(f.id, f);
  for (const f of local) map.set(f.id, f);
  return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** List all plots for a farmer */
export async function listFarmFields(userId: string): Promise<FarmField[]> {
  const local = await loadLocalFields(userId);
  if (!isSupabaseConfigured()) return local;

  try {
    const cloud = await fetchFieldsByUser(userId);
    const merged = mergeFields(local, cloud);
    if (merged.length > 0) await saveLocalFields(userId, merged);
    return merged;
  } catch {
    return local;
  }
}

export async function getFarmFieldById(
  userId: string,
  fieldId: string,
): Promise<FarmField | null> {
  const fields = await listFarmFields(userId);
  return fields.find((f) => f.id === fieldId) ?? null;
}

export interface UpsertFieldInput {
  name: string;
  latitude?: number;
  longitude?: number;
}

/** Create or update a plot (max 5 per farmer) */
export async function saveFarmField(
  userId: string,
  input: UpsertFieldInput,
  existingId?: string,
): Promise<FarmField> {
  const fields = await listFarmFields(userId);
  const name = input.name.trim();
  if (!name) throw new Error('Field name is required');

  const duplicate = fields.find(
    (f) => f.name.toLowerCase() === name.toLowerCase() && f.id !== existingId,
  );
  if (duplicate) throw new Error('You already have a field with this name');

  let field: FarmField;
  if (existingId) {
    const idx = fields.findIndex((f) => f.id === existingId);
    if (idx < 0) throw new Error('Field not found');
    field = {
      ...fields[idx],
      name,
      latitude: input.latitude,
      longitude: input.longitude,
    };
    fields[idx] = field;
  } else {
    if (fields.length >= MAX_FARM_FIELDS) {
      throw new Error(`Maximum ${MAX_FARM_FIELDS} fields allowed`);
    }
    field = {
      id: mockId('field'),
      userId,
      name,
      latitude: input.latitude,
      longitude: input.longitude,
      sortOrder: fields.length,
      createdAt: new Date().toISOString(),
    };
    fields.push(field);
  }

  await saveLocalFields(userId, fields);
  await upsertField(field);
  return field;
}

export async function removeFarmField(userId: string, fieldId: string): Promise<void> {
  const fields = (await listFarmFields(userId)).filter((f) => f.id !== fieldId);
  await saveLocalFields(userId, fields);
  await deleteCloudField(fieldId);
}

export async function getLastSelectedFieldId(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(lastFieldKey(userId));
}

export async function setLastSelectedFieldId(userId: string, fieldId: string | null): Promise<void> {
  if (fieldId) await AsyncStorage.setItem(lastFieldKey(userId), fieldId);
  else await AsyncStorage.removeItem(lastFieldKey(userId));
}

export function resolveFieldName(
  fields: FarmField[],
  fieldId?: string,
  fallbackName?: string,
): string | undefined {
  if (fieldId) {
    const match = fields.find((f) => f.id === fieldId);
    if (match) return match.name;
  }
  return fallbackName;
}
