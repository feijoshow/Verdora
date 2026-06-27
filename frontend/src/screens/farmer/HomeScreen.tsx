import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { FarmCalendarDashboard } from '../../components/home/FarmCalendarDashboard';
import { HomeHero } from '../../components/home/HomeHero';
import { QuickActionsBar } from '../../components/home/QuickActionsBar';
import { OutbreakNearYouBanner } from '../../components/intelligence/OutbreakNearYouBanner';
import { EmptyState, InlineLoader, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { listMaintenanceLogs, deleteMaintenanceLog, deleteMaintenanceLogsForCrop } from '../../services/calendar/maintenanceService';
import { listScheduledCareTasks } from '../../services/calendar/careScheduleService';
import { deletePlantingEvent, listPlantingEvents } from '../../services/api/plantationCalendarService';
import { getFarmerSummary, type FarmerSummary } from '../../services/data/farmerDataService';
import { getFarmerNearbyAlerts } from '../../services/intelligence/intelligenceService';
import {
  dismissScheduledTask,
  ensureNotificationPermissions,
  cancelRemindersForCrop,
  recordCareAndRemind,
  syncAllCropReminders,
  syncUpcomingNotifications,
} from '../../services/notifications/reminderService';
import type { DiseaseAlert } from '../../types/analytics';
import type { MaintenanceLog, MaintenanceType, ScheduledCareTask } from '../../types/maintenance';
import type { PlantingEvent } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';
import type { FarmerStackParamList, FarmerTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<FarmerTabParamList, 'Home'>,
  NativeStackScreenProps<FarmerStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FarmerSummary | null>(null);
  const [events, setEvents] = useState<PlantingEvent[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledCareTask[]>([]);
  const [nearbyAlerts, setNearbyAlerts] = useState<DiseaseAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationsReady, setNotificationsReady] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const [data, alerts, planting, logs, tasks] = await Promise.all([
      getFarmerSummary(user),
      getFarmerNearbyAlerts(user),
      listPlantingEvents(user.id),
      listMaintenanceLogs(user.id),
      listScheduledCareTasks(user.id),
    ]);
    setSummary(data);
    setNearbyAlerts(alerts);
    setEvents(planting);
    setMaintenanceLogs(logs);
    let pendingTasks = tasks.filter((t) => t.status === 'pending');

    if (planting.length > 0 && Platform.OS !== 'web' && pendingTasks.length === 0) {
      const location = user.location ?? user.townName ?? user.regionName;
      await syncAllCropReminders(user.id, planting, location);
      pendingTasks = (await listScheduledCareTasks(user.id)).filter((t) => t.status === 'pending');
    }

    setScheduledTasks(pendingTasks);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user || Platform.OS === 'web') return;
    ensureNotificationPermissions().then((granted) => {
      setNotificationsReady(granted);
      if (granted) syncUpcomingNotifications(user.id);
    });
  }, [user]);

  const handleLogCare = async (
    cropEventId: string,
    cropName: string,
    type: MaintenanceType,
  ) => {
    if (!user) return;
    await recordCareAndRemind(user.id, cropEventId, cropName, type);
    const [logs, tasks] = await Promise.all([
      listMaintenanceLogs(user.id),
      listScheduledCareTasks(user.id),
    ]);
    setMaintenanceLogs(logs);
    setScheduledTasks(tasks.filter((t) => t.status === 'pending'));
  };

  const refreshCalendarData = useCallback(async () => {
    if (!user) return;
    const [planting, logs, tasks] = await Promise.all([
      listPlantingEvents(user.id),
      listMaintenanceLogs(user.id),
      listScheduledCareTasks(user.id),
    ]);
    setEvents(planting);
    setMaintenanceLogs(logs);
    setScheduledTasks(tasks.filter((t) => t.status === 'pending'));
  }, [user]);

  const handleDeleteLog = async (logId: string) => {
    if (!user) return;
    const removed = await deleteMaintenanceLog(user.id, logId);
    if (!removed) {
      Alert.alert('Could not remove', 'That log was not found.');
      return;
    }
    await refreshCalendarData();
  };

  const handleDismissTask = async (taskId: string) => {
    if (!user) return;
    await dismissScheduledTask(user.id, taskId);
    await refreshCalendarData();
  };

  const handleDeletePlanting = async (cropEventId: string, cropName: string) => {
    if (!user) return;
    await deletePlantingEvent(user.id, cropEventId);
    await cancelRemindersForCrop(user.id, cropEventId);
    await deleteMaintenanceLogsForCrop(user.id, cropEventId);
    await refreshCalendarData();
  };

  const parentNav = navigation.getParent();

  return (
    <ScreenWrapper
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <HomeHero
        cropCount={events.length}
        scanCount={summary?.scanCount ?? 0}
      />

      <QuickActionsBar
        actions={[
          {
            key: 'scan',
            icon: 'camera',
            label: 'Scan',
            tint: colors.actionScan,
            onPress: () => navigation.navigate('Scanner'),
          },
          {
            key: 'plant',
            icon: 'calendar',
            label: 'Plant',
            tint: colors.actionPlant,
            onPress: () => navigation.navigate('Calendar'),
          },
          {
            key: 'weather',
            icon: 'partly-sunny',
            label: 'Weather',
            tint: colors.actionWeather,
            onPress: () => navigation.navigate('Weather'),
          },
          {
            key: 'chat',
            icon: 'chatbubbles',
            label: 'Chat',
            tint: colors.actionChat,
            onPress: () => navigation.navigate('Chat'),
          },
          {
            key: 'library',
            icon: 'library',
            label: 'Library',
            tint: colors.actionLibrary,
            onPress: () => parentNav?.navigate('CropLibrary'),
          },
        ]}
      />

      {Platform.OS !== 'web' && !notificationsReady ? (
        <Pressable
          style={styles.notifyChip}
          onPress={() => ensureNotificationPermissions().then(setNotificationsReady)}
        >
          <Ionicons name="notifications-outline" size={14} color={colors.textMuted} />
          <Text style={styles.notifyChipText}>Enable reminders</Text>
        </Pressable>
      ) : null}

      {nearbyAlerts.length > 0 ? (
        <OutbreakNearYouBanner
          alerts={nearbyAlerts}
          onPress={(alert) => Alert.alert('Alert', alert.message, [{ text: 'OK' }])}
        />
      ) : null}

      {loading ? (
        <InlineLoader />
      ) : (
        <FarmCalendarDashboard
          events={events}
          maintenanceLogs={maintenanceLogs}
          scheduledTasks={scheduledTasks}
          onLogCare={handleLogCare}
          onDeleteLog={handleDeleteLog}
          onDismissTask={handleDismissTask}
          onDeletePlanting={handleDeletePlanting}
          onOpenCalendar={() => navigation.navigate('Calendar')}
        />
      )}

      {!loading && events.length === 0 ? (
        <EmptyState
          message="Your calendar is empty — tap Plant to schedule your first crop."
          variant="muted"
        />
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  notifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  notifyChipText: { ...typography.caption, color: colors.textMuted },
});
