import AsyncStorage from '@react-native-async-storage/async-storage';
import { env, hasAiApi } from '../../config/env';
import type { CropPlantingGuide } from '../../data/cropPlantingGuide';
import { API_ENDPOINTS } from '../api/endpoints';
import { aiApiPost } from '../api/client';
import type { PlantingEvent } from '../../types';
import type { MaintenanceType, ScheduledCareTask } from '../../types/maintenance';
import { MAINTENANCE_LABELS } from '../../types/maintenance';
import { generateId } from '../../utils/generateId';
import { formatCropDisplayName, lookupLocalPlantingGuide } from './plantingGuideService';

const MAX_TASKS = env.demoMode ? 14 : 24;

function scheduleStorageKey(userId: string): string {
  return `@verdora_care_schedule_${userId}`;
}

function parsePlantBase(plantDate: string): Date {
  return new Date(plantDate.includes('T') ? plantDate : `${plantDate}T08:00:00`);
}

function atOffset(
  plantDate: string,
  offsetDays: number,
  hour: number,
  minute = 0,
  demoMinutes?: number,
): Date {
  const base = parsePlantBase(plantDate);
  if (env.demoMode && demoMinutes != null) {
    return new Date(base.getTime() + demoMinutes * 60 * 1000);
  }
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function taskFrom(
  userId: string,
  event: PlantingEvent,
  type: MaintenanceType | 'harvest',
  when: Date,
  message: string,
  source: ScheduledCareTask['source'],
): ScheduledCareTask | null {
  if (when.getTime() <= Date.now() - 60_000) return null;
  const cropName = formatCropDisplayName(event.cropName);
  const label = type === 'harvest' ? 'Harvest' : MAINTENANCE_LABELS[type];
  return {
    id: generateId('task'),
    userId,
    cropEventId: event.id,
    cropName,
    type,
    scheduledAt: when.toISOString(),
    title: `${label} — ${cropName}`,
    message,
    source,
    status: 'pending',
  };
}

/** Rule-based schedule when AI is unavailable */
export function buildLocalCareSchedule(
  userId: string,
  event: PlantingEvent,
  guide?: CropPlantingGuide | null,
): ScheduledCareTask[] {
  const maturity = guide?.maturityDays ?? 90;
  const tasks: ScheduledCareTask[] = [];

  if (env.demoMode) {
    const demoPlan: Array<{ type: MaintenanceType | 'harvest'; min: number; msg: string }> = [
      { type: 'water', min: 3, msg: 'Check soil moisture and water if the top layer is dry.' },
      { type: 'inspect', min: 6, msg: 'Look for pests, yellow leaves, or stunted growth.' },
      { type: 'water', min: 9, msg: 'Morning water check — avoid midday heat.' },
      { type: 'weed', min: 12, msg: 'Remove weeds competing for nutrients and water.' },
      { type: 'fertilize', min: 15, msg: 'Light feed if leaves look pale or growth is slow.' },
      { type: 'inspect', min: 18, msg: 'Mid-season health check — note any disease spots.' },
      { type: 'water', min: 21, msg: 'Regular irrigation check for your crop stage.' },
      { type: 'weed', min: 24, msg: 'Weed around the base before weeds seed.' },
    ];
    for (const step of demoPlan) {
      const t = taskFrom(
        userId,
        event,
        step.type,
        atOffset(event.plantDate, 0, 7, 0, step.min),
        step.msg,
        'local',
      );
      if (t) tasks.push(t);
    }
  } else {
    const waterEvery = 2;
    const waterCount = Math.min(10, Math.ceil(maturity / waterEvery));
    for (let i = 1; i <= waterCount; i += 1) {
      const t = taskFrom(
        userId,
        event,
        'water',
        atOffset(event.plantDate, i * waterEvery, 7),
        guide?.waterNote
          ? `Water ${event.cropName}. ${guide.waterNote}`
          : `Water ${event.cropName} — check soil before irrigating.`,
        'local',
      );
      if (t) tasks.push(t);
    }

    for (const day of [7, 14, 28, 42]) {
      if (day > maturity) continue;
      const t = taskFrom(
        userId,
        event,
        'weed',
        atOffset(event.plantDate, day, 8),
        `Weed around ${event.cropName} — clear competition while plants are growing.`,
        'local',
      );
      if (t) tasks.push(t);
    }

    for (const day of [5, 14, 28, 42, 56]) {
      if (day > maturity) continue;
      const t = taskFrom(
        userId,
        event,
        'inspect',
        atOffset(event.plantDate, day, 9),
        `Inspect ${event.cropName} for pests, disease, and nutrient stress.`,
        'local',
      );
      if (t) tasks.push(t);
    }

    for (const day of [14, 35]) {
      if (day > maturity) continue;
      const t = taskFrom(
        userId,
        event,
        'fertilize',
        atOffset(event.plantDate, day, 7, 30),
        `Fertilize ${event.cropName} if growth looks slow or leaves are pale.`,
        'local',
      );
      if (t) tasks.push(t);
    }
  }

  if (event.harvestDate) {
    const harvestWhen = env.demoMode
      ? atOffset(event.plantDate, 0, 8, 0, 30)
      : atOffset(event.harvestDate, 0, 8);
    const t = taskFrom(
      userId,
      event,
      'harvest',
      harvestWhen,
      `Your ${event.cropName} may be ready to harvest — check maturity signs.`,
      'local',
    );
    if (t) tasks.push(t);
  }

  return tasks
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, MAX_TASKS);
}

async function requestAgentCareSchedule(
  event: PlantingEvent,
  guide: CropPlantingGuide | null,
  location?: string,
): Promise<ScheduledCareTask[] | null> {
  if (!hasAiApi) return null;

  try {
    const { tasks } = await aiApiPost<{ tasks: Array<{
      type: string;
      scheduledAt: string;
      title?: string;
      message?: string;
    }> }>(API_ENDPOINTS.calendar.careSchedule, {
      cropName: formatCropDisplayName(event.cropName),
      plantDate: event.plantDate,
      harvestDate: event.harvestDate,
      maturityDays: guide?.maturityDays,
      irrigation: guide?.irrigation,
      waterNote: guide?.waterNote,
      location,
      demoMode: env.demoMode,
    });

    if (!Array.isArray(tasks) || tasks.length === 0) return null;

    const allowed = new Set(['water', 'fertilize', 'weed', 'pest', 'inspect', 'harvest', 'other']);
    const parsed: ScheduledCareTask[] = [];

    for (const raw of tasks.slice(0, MAX_TASKS)) {
      const type = raw.type?.toLowerCase() ?? 'inspect';
      if (!allowed.has(type)) continue;
      const when = new Date(raw.scheduledAt);
      if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now() - 60_000) continue;

      parsed.push({
        id: generateId('task'),
        userId: '',
        cropEventId: event.id,
        cropName: formatCropDisplayName(event.cropName),
        type: type as ScheduledCareTask['type'],
        scheduledAt: when.toISOString(),
        title: raw.title?.trim() || `${type} — ${event.cropName}`,
        message: raw.message?.trim() || `Care task for ${event.cropName}.`,
        source: 'agent',
        status: 'pending',
      });
    }

    return parsed.length > 0 ? parsed.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)) : null;
  } catch {
    return null;
  }
}

export async function listScheduledCareTasks(userId: string): Promise<ScheduledCareTask[]> {
  try {
    const raw = await AsyncStorage.getItem(scheduleStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScheduledCareTask[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listPendingTasksForCrop(
  userId: string,
  cropEventId: string,
): Promise<ScheduledCareTask[]> {
  const all = await listScheduledCareTasks(userId);
  return all
    .filter((t) => t.cropEventId === cropEventId && t.status === 'pending')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
}

export async function saveCareScheduleForCrop(
  userId: string,
  cropEventId: string,
  tasks: ScheduledCareTask[],
): Promise<void> {
  const existing = await listScheduledCareTasks(userId);
  const keep = existing.filter((t) => t.cropEventId !== cropEventId);
  const normalized = tasks.map((t) => ({ ...t, userId, cropEventId }));
  await AsyncStorage.setItem(
    scheduleStorageKey(userId),
    JSON.stringify([...keep, ...normalized]),
  );
}

export async function cancelScheduledTask(userId: string, taskId: string): Promise<boolean> {
  const all = await listScheduledCareTasks(userId);
  let changed = false;
  const next = all.map((t) => {
    if (t.id !== taskId) return t;
    changed = true;
    return { ...t, status: 'cancelled' as const };
  });
  if (!changed) return false;
  await AsyncStorage.setItem(scheduleStorageKey(userId), JSON.stringify(next));
  return true;
}

export async function cancelAllTasksForCrop(userId: string, cropEventId: string): Promise<void> {
  const all = await listScheduledCareTasks(userId);
  const next = all.map((t) =>
    t.cropEventId === cropEventId ? { ...t, status: 'cancelled' as const } : t,
  );
  await AsyncStorage.setItem(scheduleStorageKey(userId), JSON.stringify(next));
}

export async function markNearestTaskComplete(
  userId: string,
  cropEventId: string,
  type: MaintenanceType,
): Promise<void> {
  const all = await listScheduledCareTasks(userId);
  const now = Date.now();
  const pending = all
    .filter((t) => t.cropEventId === cropEventId && t.type === type && t.status === 'pending')
    .sort(
      (a, b) =>
        Math.abs(new Date(a.scheduledAt).getTime() - now) -
        Math.abs(new Date(b.scheduledAt).getTime() - now),
    );

  const nearest = pending[0];
  if (!nearest) return;

  const next = all.map((t) =>
    t.id === nearest.id ? { ...t, status: 'completed' as const } : t,
  );
  await AsyncStorage.setItem(scheduleStorageKey(userId), JSON.stringify(next));
}

export async function generateAndStoreCareSchedule(
  userId: string,
  event: PlantingEvent,
  location?: string,
): Promise<ScheduledCareTask[]> {
  const guide = lookupLocalPlantingGuide(event.cropName);
  const agentTasks = await requestAgentCareSchedule(event, guide, location);
  const tasks = (agentTasks ?? buildLocalCareSchedule(userId, event, guide)).map((t) => ({
    ...t,
    userId,
    cropEventId: event.id,
    cropName: formatCropDisplayName(event.cropName),
  }));

  await saveCareScheduleForCrop(userId, event.id, tasks);
  return tasks;
}
