import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  StyleSheet,
  Text,
} from 'react-native';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { EmptyState, InlineLoader, ScreenWrapper } from '../../components/ui';
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
import type { PlantingEvent } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';

export function PlantationCalendarScreen() {
  const { user } = useAuth();
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
      setPlannerKey((k) => k + 1);
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
      setEditModalVisible(false);
      await loadEvents(true);
    } catch (err) {
      Alert.alert('Error', toApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (event: PlantingEvent) => {
    Alert.alert('Delete event', `Remove ${event.cropName} from your calendar?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (!user) return;
            await deletePlantingEvent(user.id, event.id);
            await trackCropDeleted(user, event.id);
            await loadEvents(true);
          } catch (err) {
            Alert.alert('Error', toApiError(err).message);
          }
        },
      },
    ]);
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
        <ScreenHeader title="Calendar" />

        {user ? (
          <CropPlantingPlanner
            key={plannerKey}
            userId={user.id}
            onSave={handlePlannerSave}
            saving={saving}
          />
        ) : null}

        <Text style={styles.sectionTitle}>My calendar ({events.length})</Text>

        {loading && events.length === 0 ? (
          <InlineLoader />
        ) : events.length === 0 ? (
          <EmptyState
            message='No crops scheduled yet. Pick a crop above and tap "Add to my calendar".'
            variant="muted"
          />
        ) : (
          events.map((event) => (
            <PlantingEventCard
              key={event.id}
              event={event}
              onPress={() => openEdit(event)}
              onDelete={() => handleDelete(event)}
            />
          ))
        )}
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

const styles = StyleSheet.create({
  sectionTitle: { ...typography.h3, marginVertical: spacing.md },
});
