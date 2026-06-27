import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { EmptyState, InlineLoader, ScreenWrapper, SegmentedControl } from '../../components/ui';
import { CropPlantingPlanner, type PlannerSavePayload } from '../../components/calendar/CropPlantingPlanner';
import { EventFormModal, type EventFormValues } from '../../components/calendar/EventFormModal';
import { PlantingEventCard } from '../../components/calendar/PlantingEventCard';
import { useAuth } from '../../context/AuthContext';
import { trackCropDeleted, trackFarmingRecord } from '../../services/analytics/dataCollectionService';
import {
  createPlantingEvent,
  deletePlantingEvent,
  listPlantingEvents,
  updatePlantingEvent,
} from '../../services/api/plantationCalendarService';
import { toApiError } from '../../services/api/errors';
import {
  cancelRemindersForCrop,
  recordCareAndRemind,
  scheduleCropCareReminders,
} from '../../services/notifications/reminderService';
import type { MaintenanceType } from '../../types/maintenance';
import type { PlantingEvent } from '../../types';
import { colors } from '../../constants/theme';

type CalendarTab = 'plan' | 'mine';

export function PlantationCalendarScreen() {
  const { user } = useAuth();
  const [tab, setTab] = useState<CalendarTab>('plan');
  const [events, setEvents] = useState<PlantingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlantingEvent | null>(null);
  const [plannerKey, setPlannerKey] = useState(0);

  const loadEvents = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await listPlantingEvents(user.id);
      setEvents(data);
    } catch (err) {
      Alert.alert('Error', toApiError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openEdit = (event: PlantingEvent) => {
    setEditingEvent(event);
    setEditModalVisible(true);
  };

  const handlePlannerSave = async (payload: PlannerSavePayload) => {
    if (!user) return;
    setSaving(true);
    try {
      const saved = await createPlantingEvent(user.id, {
        cropName: payload.cropName,
        plantDate: payload.plantDate,
        harvestDate: payload.harvestDate || undefined,
        fieldId: payload.fieldId ?? undefined,
        fieldName: payload.fieldName || undefined,
        notes: payload.notes || undefined,
      }, user);
      await trackFarmingRecord(user, saved);
      await scheduleCropCareReminders(
        user.id,
        saved,
        user.location ?? user.townName ?? user.regionName,
      );
      setPlannerKey((k) => k + 1);
      setTab('mine');
      await loadEvents(true);
      Alert.alert('Added', `${payload.cropName} is on your calendar.`);
    } catch (err) {
      Alert.alert('Error', toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (values: EventFormValues) => {
    if (!user || !editingEvent) return;
    setSaving(true);
    try {
      const saved = await updatePlantingEvent(user.id, editingEvent.id, {
        cropName: values.cropName.trim(),
        plantDate: values.plantDate.trim(),
        harvestDate: values.harvestDate.trim() || undefined,
        fieldId: values.fieldId ?? undefined,
        fieldName: values.fieldName.trim() || undefined,
        notes: values.notes.trim() || undefined,
      }, user);
      await trackFarmingRecord(user, saved);
      await scheduleCropCareReminders(
        user.id,
        saved,
        user.location ?? user.townName ?? user.regionName,
      );
      setEditModalVisible(false);
      await loadEvents(true);
    } catch (err) {
      Alert.alert('Error', toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (event: PlantingEvent) => {
    Alert.alert('Delete crop', `Remove ${event.cropName} from your calendar?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user) return;
            await deletePlantingEvent(user.id, event.id);
            await cancelRemindersForCrop(user.id, event.id);
            await trackCropDeleted(user, event.id);
            await loadEvents(true);
          } catch (err) {
            Alert.alert('Error', toApiError(err).message);
          }
        },
      },
    ]);
  };

  const handleLogCare = async (
    event: PlantingEvent,
    type: MaintenanceType,
  ) => {
    if (!user) return;
    await recordCareAndRemind(user.id, event.id, event.cropName, type);
    Alert.alert('Logged', `${event.cropName} — care recorded.`);
  };

  return (
    <>
      <ScreenWrapper
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadEvents(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <ScreenHeader banner title="Plant" />

        <SegmentedControl
          options={[
            { value: 'plan', label: 'Add crop' },
            { value: 'mine', label: `My crops (${events.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'plan' && user ? (
          <CropPlantingPlanner
            key={plannerKey}
            userId={user.id}
            userLocation={user.location ?? user.townName ?? user.regionName}
            onSave={handlePlannerSave}
            saving={saving}
          />
        ) : null}

        {tab === 'mine' ? (
          loading && events.length === 0 ? (
            <InlineLoader />
          ) : events.length === 0 ? (
            <EmptyState
              message='Nothing scheduled yet. Switch to "Add crop" to plan your first planting.'
              variant="muted"
            />
          ) : (
            events.map((event) => (
            <PlantingEventCard
              key={event.id}
              event={event}
              onPress={() => openEdit(event)}
              onDelete={() => handleDelete(event)}
              onLogCare={(type) => handleLogCare(event, type)}
            />
            ))
          )
        ) : null}
      </ScreenWrapper>

      <EventFormModal
        visible={editModalVisible}
        userId={user?.id ?? ''}
        event={editingEvent}
        onClose={() => setEditModalVisible(false)}
        onSave={handleEditSave}
        saving={saving}
      />
    </>
  );
}
