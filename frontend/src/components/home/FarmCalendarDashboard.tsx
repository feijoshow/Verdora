import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlantingEvent } from '../../types';
import type { FarmCalendarEntry, MaintenanceType, ScheduledCareTask } from '../../types/maintenance';
import { MAINTENANCE_ICONS, MAINTENANCE_LABELS } from '../../types/maintenance';
import {
  buildFarmCalendarEntries,
  dateKeyFromDate,
  entriesForDate,
  getMonthGrid,
} from '../../services/calendar/farmCalendarService';
import type { MaintenanceLog } from '../../types/maintenance';
import { confirmDestructive } from '../../utils/confirmAction';
import { Card } from '../ui/Card';
import { colors, spacing, typography, borderRadius, touchTarget } from '../../constants/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const KIND_COLORS: Record<FarmCalendarEntry['kind'], string> = {
  plant: colors.primary,
  harvest: colors.secondaryDark,
  maintenance: colors.primaryLight,
  reminder: colors.warning,
};

interface FarmCalendarDashboardProps {
  events: PlantingEvent[];
  maintenanceLogs: MaintenanceLog[];
  scheduledTasks?: ScheduledCareTask[];
  onLogCare?: (cropEventId: string, cropName: string, type: MaintenanceType) => void;
  onDeleteLog?: (logId: string) => void | Promise<void>;
  onDismissTask?: (taskId: string) => void | Promise<void>;
  onDeletePlanting?: (cropEventId: string, cropName: string) => void | Promise<void>;
  onOpenCalendar?: () => void;
}

export function FarmCalendarDashboard({
  events,
  maintenanceLogs,
  scheduledTasks = [],
  onLogCare,
  onDeleteLog,
  onDismissTask,
  onDeletePlanting,
  onOpenCalendar,
}: FarmCalendarDashboardProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(dateKeyFromDate(today));
  const [careOpen, setCareOpen] = useState(false);

  const entries = useMemo(
    () => buildFarmCalendarEntries(events, maintenanceLogs, scheduledTasks),
    [events, maintenanceLogs, scheduledTasks],
  );

  const weeks = useMemo(
    () => getMonthGrid(viewMonth.getFullYear(), viewMonth.getMonth()),
    [viewMonth],
  );
  const dayEntries = useMemo(
    () => entriesForDate(entries, selectedKey),
    [entries, selectedKey],
  );

  const monthLabel = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const shiftMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const confirmRemove = async (entry: FarmCalendarEntry) => {
    if (removingId) return;

    const isReminder = entry.kind === 'reminder';
    const isPlant = entry.kind === 'plant';

    const ok = await confirmDestructive(
      isPlant ? 'Remove crop' : isReminder ? 'Cancel reminder' : 'Remove log',
      isPlant
        ? `Remove ${entry.title.replace(/^Planted /, '')} from your calendar?`
        : isReminder
          ? 'Cancel this scheduled care reminder?'
          : 'Remove this care log? Use this if you tapped by mistake.',
      isPlant ? 'Remove' : isReminder ? 'Cancel' : 'Remove',
    );

    if (!ok) return;

    setRemovingId(entry.id);
    try {
      if (isPlant && entry.cropEventId) {
        const cropName = entry.title.replace(/^Planted /, '');
        await onDeletePlanting?.(entry.cropEventId, cropName);
      } else if (isReminder) {
        await onDismissTask?.(entry.id);
      } else if (entry.kind === 'maintenance') {
        await onDeleteLog?.(entry.id);
      }
    } catch {
      Alert.alert('Could not remove', 'Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const canDelete = (entry: FarmCalendarEntry): boolean => {
    if (entry.kind === 'plant') return Boolean(entry.cropEventId && onDeletePlanting);
    if (entry.kind === 'maintenance') return Boolean(onDeleteLog);
    if (entry.kind === 'reminder') return Boolean(onDismissTask);
    return false;
  };

  const activeCrops = events.filter((e) => {
    const plant = e.plantDate.slice(0, 10);
    const harvest = e.harvestDate?.slice(0, 10);
    return selectedKey >= plant && (!harvest || selectedKey <= harvest);
  });

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Calendar</Text>
        {onOpenCalendar ? (
          <Pressable style={styles.addBtn} onPress={onOpenCalendar}>
            <Ionicons name="add" size={18} color={colors.white} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.monthNav}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={12} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.calendarBox}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={`${d}-${i}`} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={`w-${wi}`} style={styles.weekRow}>
            {week.map((date, di) => {
              if (!date) {
                return <View key={`e-${wi}-${di}`} style={styles.dayCell} />;
              }
              const key = dateKeyFromDate(date);
              const isSelected = key === selectedKey;
              const isToday = key === dateKeyFromDate(today);
              const dayItems = entriesForDate(entries, key);

              return (
                <Pressable
                  key={key}
                  style={[styles.dayCell, isSelected && styles.daySelected]}
                  onPress={() => setSelectedKey(key)}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      isSelected && styles.dayNumSelected,
                      isToday && !isSelected && styles.dayNumToday,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {dayItems.length > 0 ? (
                    <View style={styles.dotRow}>
                      {dayItems.slice(0, 3).map((entry) => (
                        <View
                          key={entry.id}
                          style={[styles.dot, { backgroundColor: KIND_COLORS[entry.kind] }]}
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={styles.dotSpacer} />
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.agenda}>
        <Text style={styles.agendaDate}>
          {new Date(`${selectedKey}T12:00:00`).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </Text>

        {dayEntries.length === 0 ? (
          <Text style={styles.emptyDay}>Free day — no tasks scheduled</Text>
        ) : (
          dayEntries.map((entry) => (
            <View key={entry.id} style={styles.agendaRow}>
              <View style={[styles.kindDot, { backgroundColor: KIND_COLORS[entry.kind] }]} />
              <View style={styles.agendaTextWrap}>
                <Text style={styles.agendaText}>{entry.title}</Text>
                {entry.subtitle ? (
                  <Text style={styles.agendaSub} numberOfLines={2}>
                    {entry.subtitle}
                  </Text>
                ) : null}
              </View>
              {canDelete(entry) ? (
                <TouchableOpacity
                  onPress={() => void confirmRemove(entry)}
                  disabled={removingId === entry.id}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={
                    entry.kind === 'plant'
                      ? 'Remove crop'
                      : entry.kind === 'reminder'
                        ? 'Cancel reminder'
                        : 'Remove care log'
                  }
                >
                  <Ionicons
                    name={
                      entry.kind === 'reminder'
                        ? 'close-circle-outline'
                        : entry.kind === 'plant'
                          ? 'trash-outline'
                          : 'trash-outline'
                    }
                    size={20}
                    color={removingId === entry.id ? colors.border : colors.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}
      </View>

      {activeCrops.length > 0 && onLogCare ? (
        <>
          <Pressable style={styles.careToggle} onPress={() => setCareOpen((v) => !v)}>
            <Text style={styles.careToggleText}>Log care</Text>
            <Ionicons
              name={careOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
          {careOpen
            ? activeCrops.map((crop) => (
                <View key={crop.id} style={styles.careCrop}>
                  <Text style={styles.careCropName}>{crop.cropName}</Text>
                  <View style={styles.careButtons}>
                    {(['water', 'fertilize', 'weed', 'inspect'] as MaintenanceType[]).map(
                      (type) => (
                        <Pressable
                          key={type}
                          style={styles.careBtn}
                          onPress={() => onLogCare(crop.id, crop.cropName, type)}
                        >
                          <Ionicons
                            name={MAINTENANCE_ICONS[type] as keyof typeof Ionicons.glyphMap}
                            size={15}
                            color={colors.primary}
                          />
                        </Pressable>
                      ),
                    )}
                  </View>
                </View>
              ))
            : null}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg, padding: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.text, fontSize: 20 },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: { ...typography.bodySmall, fontWeight: '700', color: colors.text },
  calendarBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    margin: 2,
  },
  daySelected: { backgroundColor: colors.primary },
  dayNum: { ...typography.caption, fontWeight: '600', color: colors.text },
  dayNumSelected: { color: colors.white },
  dayNumToday: { color: colors.primary, fontWeight: '800' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 3, height: 5 },
  dotSpacer: { height: 8 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  agenda: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  agendaDate: { ...typography.bodySmall, fontWeight: '700', marginBottom: spacing.sm },
  emptyDay: { ...typography.caption, color: colors.textMuted },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  kindDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  agendaTextWrap: { flex: 1, minWidth: 0 },
  agendaText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
  agendaSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  removeBtn: {
    minWidth: touchTarget,
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  careToggleText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  careCrop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  careCropName: { ...typography.bodySmall, fontWeight: '600' },
  careButtons: { flexDirection: 'row', gap: spacing.xs },
  careBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
