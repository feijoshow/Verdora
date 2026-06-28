export type MaintenanceType = 'water' | 'fertilize' | 'weed' | 'pest' | 'inspect' | 'other';

export interface MaintenanceLog {
  id: string;
  userId: string;
  cropEventId: string;
  cropName: string;
  type: MaintenanceType;
  performedAt: string;
  notes?: string;
}

export type CalendarEntryKind = 'plant' | 'harvest' | 'maintenance' | 'reminder';

/** Agent-planned care task with a specific date and time */
export interface ScheduledCareTask {
  id: string;
  userId: string;
  cropEventId: string;
  cropName: string;
  type: MaintenanceType | 'harvest';
  scheduledAt: string;
  title: string;
  message: string;
  source: 'agent' | 'local';
  status: 'pending' | 'completed' | 'cancelled';
  notificationId?: string;
}

export interface FarmCalendarEntry {
  id: string;
  date: string;
  kind: CalendarEntryKind;
  title: string;
  subtitle?: string;
  scheduledAt?: string;
  cropEventId?: string;
  maintenanceType?: MaintenanceType;
  /** When set, entry can be removed (care log or upcoming reminder) */
  deletable?: boolean;
}

export const MAINTENANCE_LABELS: Record<MaintenanceType, string> = {
  water: 'Watered',
  fertilize: 'Fertilized',
  weed: 'Weeded',
  pest: 'Pest treatment',
  inspect: 'Inspected',
  other: 'Care logged',
};

export const MAINTENANCE_ICONS: Record<MaintenanceType, string> = {
  water: 'water',
  fertilize: 'nutrition',
  weed: 'leaf',
  pest: 'bug',
  inspect: 'search',
  other: 'checkmark-circle',
};
