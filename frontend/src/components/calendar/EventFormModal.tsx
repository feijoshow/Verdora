import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PlantingEvent } from '../../types';
import type { FarmField } from '../../types/field';
import { FieldPicker } from '../fields/FieldPicker';
import { Button, Input } from '../ui';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

export interface EventFormValues {
  cropName: string;
  plantDate: string;
  harvestDate: string;
  fieldId: string | null;
  fieldName: string;
  notes: string;
}

interface EventFormModalProps {
  visible: boolean;
  userId: string;
  event?: PlantingEvent | null;
  onClose: () => void;
  onSave: (values: EventFormValues) => void;
  saving?: boolean;
}

const EMPTY: EventFormValues = {
  cropName: '',
  plantDate: '',
  harvestDate: '',
  fieldId: null,
  fieldName: '',
  notes: '',
};

export function EventFormModal({
  visible,
  userId,
  event,
  onClose,
  onSave,
  saving = false,
}: EventFormModalProps) {
  const [values, setValues] = useState<EventFormValues>(EMPTY);

  useEffect(() => {
    if (event) {
      setValues({
        cropName: event.cropName,
        plantDate: event.plantDate,
        harvestDate: event.harvestDate ?? '',
        fieldId: event.fieldId ?? null,
        fieldName: event.fieldName ?? '',
        notes: event.notes ?? '',
      });
    } else {
      setValues(EMPTY);
    }
  }, [event, visible]);

  const update = (key: keyof EventFormValues, text: string) => {
    setValues((prev) => ({ ...prev, [key]: text }));
  };

  const handleFieldChange = (fieldId: string | null, field: FarmField | null) => {
    setValues((prev) => ({
      ...prev,
      fieldId,
      fieldName: field?.name ?? '',
    }));
  };

  const handleSave = () => {
    if (!values.cropName.trim() || !values.plantDate.trim()) return;
    onSave(values);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.title}>{event ? 'Edit planting event' : 'Add planting event'}</Text>

            <ScrollView
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Input
                label="Crop name *"
                value={values.cropName}
                onChangeText={(t) => update('cropName', t)}
                placeholder="e.g. Rice, Tomato"
              />
              <Input
                label="Plant date * (YYYY-MM-DD)"
                value={values.plantDate}
                onChangeText={(t) => update('plantDate', t)}
                placeholder="2026-06-15"
              />
              <Input
                label="Harvest date (YYYY-MM-DD)"
                value={values.harvestDate}
                onChangeText={(t) => update('harvestDate', t)}
                placeholder="2026-09-20"
              />
              <FieldPicker
                userId={userId}
                value={values.fieldId}
                onChange={handleFieldChange}
                label="Field / plot"
              />
              <Input
                label="Notes"
                value={values.notes}
                onChangeText={(t) => update('notes', t)}
                placeholder="Variety, pest watch, etc."
                multiline
                numberOfLines={3}
                style={styles.notesInput}
              />
            </ScrollView>

            <View style={styles.actions}>
              <Button title="Cancel" variant="outline" onPress={onClose} style={styles.btn} />
              <Button
                title={event ? 'Save changes' : 'Add event'}
                onPress={handleSave}
                loading={saving}
                disabled={!values.cropName.trim() || !values.plantDate.trim()}
                style={styles.btn}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheetWrap: { maxHeight: '90%', width: '100%' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.md,
    maxHeight: '100%',
  },
  formScroll: { flexShrink: 1 },
  formContent: { paddingBottom: spacing.sm },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h3, color: colors.primary, marginBottom: spacing.md },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  btn: { flex: 1 },
});
