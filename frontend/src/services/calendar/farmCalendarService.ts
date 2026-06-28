import type { PlantingEvent } from '../../types';
import type { FarmCalendarEntry, MaintenanceLog, ScheduledCareTask } from '../../types/maintenance';
import { MAINTENANCE_LABELS } from '../../types/maintenance';

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTaskTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function buildFarmCalendarEntries(
  events: PlantingEvent[],
  maintenanceLogs: MaintenanceLog[],
  scheduledTasks: ScheduledCareTask[] = [],
): FarmCalendarEntry[] {
  const entries: FarmCalendarEntry[] = [];

  for (const event of events) {
    entries.push({
      id: `plant-${event.id}`,
      date: toDateKey(event.plantDate),
      kind: 'plant',
      title: `Planted ${event.cropName}`,
      subtitle: event.fieldName ? `Field: ${event.fieldName}` : undefined,
      cropEventId: event.id,
      deletable: true,
    });

    if (event.harvestDate) {
      entries.push({
        id: `harvest-${event.id}`,
        date: toDateKey(event.harvestDate),
        kind: 'harvest',
        title: `Harvest ${event.cropName}`,
        subtitle: `Planted ${formatShortDate(event.plantDate)}`,
        cropEventId: event.id,
      });
    }
  }

  for (const log of maintenanceLogs) {
    entries.push({
      id: log.id,
      date: toDateKey(log.performedAt),
      kind: 'maintenance',
      title: `${MAINTENANCE_LABELS[log.type]} — ${log.cropName}`,
      subtitle: log.notes,
      scheduledAt: log.performedAt,
      cropEventId: log.cropEventId,
      maintenanceType: log.type,
      deletable: true,
    });
  }

  for (const task of scheduledTasks) {
    if (task.status !== 'pending') continue;
    entries.push({
      id: task.id,
      date: toDateKey(task.scheduledAt),
      kind: 'reminder',
      title: task.title,
      subtitle: `${formatTaskTime(task.scheduledAt)} · ${task.message}`,
      scheduledAt: task.scheduledAt,
      cropEventId: task.cropEventId,
      maintenanceType: task.type === 'harvest' ? undefined : task.type,
      deletable: true,
    });
  }

  return entries.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    const aTime = a.scheduledAt ?? '';
    const bTime = b.scheduledAt ?? '';
    return aTime.localeCompare(bTime);
  });
}

export function getMonthGrid(year: number, monthIndex: number): (Date | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(year, monthIndex, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

export function dateKeyFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function entriesForDate(entries: FarmCalendarEntry[], dateKey: string): FarmCalendarEntry[] {
  return entries.filter((e) => e.date === dateKey);
}

export function datesWithEntries(entries: FarmCalendarEntry[]): Set<string> {
  return new Set(entries.map((e) => e.date));
}
