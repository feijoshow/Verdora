import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaintenanceLog, MaintenanceType } from '../../types/maintenance';
import { formatCropDisplayName } from './plantingGuideService';
import { generateId } from '../../utils/generateId';

function storageKey(userId: string): string {
  return `@verdora_maintenance_${userId}`;
}

export async function listMaintenanceLogs(userId: string): Promise<MaintenanceLog[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MaintenanceLog[];
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => b.performedAt.localeCompare(a.performedAt))
      : [];
  } catch {
    return [];
  }
}

export async function listLogsForCrop(userId: string, cropEventId: string): Promise<MaintenanceLog[]> {
  const all = await listMaintenanceLogs(userId);
  return all.filter((log) => log.cropEventId === cropEventId);
}

export async function logMaintenance(
  userId: string,
  cropEventId: string,
  cropName: string,
  type: MaintenanceType,
  notes?: string,
  performedAt = new Date().toISOString(),
): Promise<MaintenanceLog> {
  const entry: MaintenanceLog = {
    id: generateId('care'),
    userId,
    cropEventId,
    cropName: formatCropDisplayName(cropName),
    type,
    performedAt,
    notes: notes?.trim() || undefined,
  };

  const existing = await listMaintenanceLogs(userId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify([entry, ...existing]));
  return entry;
}

export async function deleteMaintenanceLog(userId: string, logId: string): Promise<boolean> {
  const existing = await listMaintenanceLogs(userId);
  const next = existing.filter((log) => log.id !== logId);
  if (next.length === existing.length) return false;
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
  return true;
}

export async function deleteMaintenanceLogsForCrop(
  userId: string,
  cropEventId: string,
): Promise<void> {
  const existing = await listMaintenanceLogs(userId);
  const next = existing.filter((log) => log.cropEventId !== cropEventId);
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
}

export async function getLastMaintenance(
  userId: string,
  cropEventId: string,
  type?: MaintenanceType,
): Promise<MaintenanceLog | null> {
  const logs = await listLogsForCrop(userId, cropEventId);
  const filtered = type ? logs.filter((l) => l.type === type) : logs;
  return filtered[0] ?? null;
}
