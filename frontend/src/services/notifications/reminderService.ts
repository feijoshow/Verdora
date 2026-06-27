import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlantingEvent } from '../../types';
import type { MaintenanceType } from '../../types/maintenance';
import {
  cancelAllTasksForCrop,
  cancelScheduledTask,
  generateAndStoreCareSchedule,
  listScheduledCareTasks,
  markNearestTaskComplete,
} from '../calendar/careScheduleService';
import { logMaintenance } from '../calendar/maintenanceService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface StoredReminder {
  notificationId: string;
  taskId: string;
  cropEventId: string;
}

const MAX_SCHEDULED_NOTIFICATIONS = 15;

function reminderStorageKey(userId: string): string {
  return `@verdora_reminders_${userId}`;
}

async function loadStoredReminders(userId: string): Promise<StoredReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(reminderStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredReminder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveStoredReminders(userId: string, items: StoredReminder[]): Promise<void> {
  await AsyncStorage.setItem(reminderStorageKey(userId), JSON.stringify(items));
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleLocalNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data: Record<string, string>,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (triggerDate.getTime() <= Date.now() + 1000) return null;

  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch {
    return null;
  }
}

async function cancelAllStoredNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const stored = await loadStoredReminders(userId);
  for (const item of stored) {
    await Notifications.cancelScheduledNotificationAsync(item.notificationId).catch(() => undefined);
  }
  await saveStoredReminders(userId, []);
}

/** Sync the next batch of agent-planned reminders to the OS notification queue */
export async function syncUpcomingNotifications(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermissions();
  if (!granted) return;

  await cancelAllStoredNotifications(userId);

  const tasks = (await listScheduledCareTasks(userId))
    .filter((t) => t.status === 'pending' && new Date(t.scheduledAt).getTime() > Date.now() + 1000)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, MAX_SCHEDULED_NOTIFICATIONS);

  const stored: StoredReminder[] = [];

  for (const task of tasks) {
    const when = new Date(task.scheduledAt);
    const id = await scheduleLocalNotification(task.title, task.message, when, {
      taskId: task.id,
      cropEventId: task.cropEventId,
      cropName: task.cropName,
      type: task.type,
    });
    if (id) {
      stored.push({ notificationId: id, taskId: task.id, cropEventId: task.cropEventId });
    }
  }

  await saveStoredReminders(userId, stored);
}

export async function cancelRemindersForCrop(userId: string, cropEventId: string): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelAllTasksForCrop(userId, cropEventId);

  const stored = await loadStoredReminders(userId);
  const keep: StoredReminder[] = [];

  for (const item of stored) {
    if (item.cropEventId === cropEventId) {
      await Notifications.cancelScheduledNotificationAsync(item.notificationId).catch(() => undefined);
    } else {
      keep.push(item);
    }
  }

  await saveStoredReminders(userId, keep);
  await syncUpcomingNotifications(userId);
}

/** Build agent care plan and register timed notifications */
export async function scheduleCropCareReminders(
  userId: string,
  event: PlantingEvent,
  location?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelRemindersForCrop(userId, event.id);
  await generateAndStoreCareSchedule(userId, event, location);
  await syncUpcomingNotifications(userId);
}

export async function syncAllCropReminders(
  userId: string,
  events: PlantingEvent[],
  location?: string,
): Promise<void> {
  for (const event of events) {
    await scheduleCropCareReminders(userId, event, location);
  }
}

export async function dismissScheduledTask(userId: string, taskId: string): Promise<void> {
  await cancelScheduledTask(userId, taskId);
  await syncUpcomingNotifications(userId);
}

/** Log maintenance from UI, mark matching agent task done, refresh notifications */
export async function recordCareAndRemind(
  userId: string,
  cropEventId: string,
  cropName: string,
  type: MaintenanceType,
): Promise<void> {
  await logMaintenance(userId, cropEventId, cropName, type);
  await markNearestTaskComplete(userId, cropEventId, type);
  await syncUpcomingNotifications(userId);
}

export function formatNextReminderLabel(nextMs: number): string {
  if (nextMs <= 0) return 'Due now';
  const mins = Math.round(nextMs / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `in ${hours} hr`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export function formatTaskTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
