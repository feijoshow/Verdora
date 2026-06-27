import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from '../ui';
import { MAX_FARM_FIELDS } from '../../constants/fields';
import {
  listFarmFields,
  removeFarmField,
  saveFarmField,
} from '../../services/fields/fieldService';
import type { FarmField } from '../../types/field';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface FieldsManagerProps {
  userId: string;
  embedded?: boolean;
}

/** CRUD for up to 5 named plots with optional coordinates */
export function FieldsManager({ userId, embedded = false }: FieldsManagerProps) {
  const [fields, setFields] = useState<FarmField[]>([]);
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setFields(await listFarmFields(userId));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName('');
    setLatitude('');
    setLongitude('');
    setEditingId(null);
  };

  const startEdit = (field: FarmField) => {
    setEditingId(field.id);
    setName(field.name);
    setLatitude(field.latitude != null ? String(field.latitude) : '');
    setLongitude(field.longitude != null ? String(field.longitude) : '');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this plot a name, e.g. North field.');
      return;
    }
    setSaving(true);
    try {
      const lat = latitude.trim() ? parseFloat(latitude) : undefined;
      const lng = longitude.trim() ? parseFloat(longitude) : undefined;
      if (latitude.trim() && Number.isNaN(lat!)) throw new Error('Invalid latitude');
      if (longitude.trim() && Number.isNaN(lng!)) throw new Error('Invalid longitude');

      await saveFarmField(
        userId,
        { name: name.trim(), latitude: lat, longitude: lng },
        editingId ?? undefined,
      );
      resetForm();
      await load();
    } catch (err) {
      Alert.alert('Could not save field', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (field: FarmField) => {
    Alert.alert('Remove field', `Delete "${field.name}"? Calendar and scans keep their labels.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeFarmField(userId, field.id);
          if (editingId === field.id) resetForm();
          await load();
        },
      },
    ]);
  };

  const body = (
    <>
      {!embedded ? (
        <Text style={styles.title}>My fields ({fields.length}/{MAX_FARM_FIELDS})</Text>
      ) : null}
      <Text style={styles.subtitle}>
        Name each plot so scans, calendar, and weather can be tagged per field.
      </Text>

      {fields.map((field) => (
        <View key={field.id} style={styles.fieldRow}>
          <View style={styles.fieldInfo}>
            <Text style={styles.fieldName}>{field.name}</Text>
            {field.latitude != null && field.longitude != null ? (
              <Text style={styles.coords}>
                {field.latitude.toFixed(4)}, {field.longitude.toFixed(4)}
              </Text>
            ) : (
              <Text style={styles.coordsMuted}>No GPS pin — uses farm location</Text>
            )}
          </View>
          <Pressable onPress={() => startEdit(field)} hitSlop={8}>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => handleDelete(field)} hitSlop={8}>
            <Text style={styles.delete}>✕</Text>
          </Pressable>
        </View>
      ))}

      {fields.length < MAX_FARM_FIELDS || editingId ? (
        <>
          <Input
            label={editingId ? 'Edit field name' : 'New field name'}
            value={name}
            onChangeText={setName}
            placeholder="e.g. North field, Greenhouse B"
          />
          <Input
            label="Latitude (optional)"
            value={latitude}
            onChangeText={setLatitude}
            placeholder="14.1234"
            keyboardType="decimal-pad"
          />
          <Input
            label="Longitude (optional)"
            value={longitude}
            onChangeText={setLongitude}
            placeholder="121.0567"
            keyboardType="decimal-pad"
          />
          <View style={styles.actions}>
            <Button
              title={editingId ? 'Update field' : 'Add field'}
              onPress={handleSave}
              loading={saving}
              style={styles.btn}
            />
            {editingId ? (
              <Button title="Cancel" variant="ghost" onPress={resetForm} style={styles.btn} />
            ) : null}
          </View>
        </>
      ) : (
        <Text style={styles.limit}>Maximum {MAX_FARM_FIELDS} fields reached.</Text>
      )}
    </>
  );

  if (embedded) return <View>{body}</View>;

  return <Card style={styles.card}>{body}</Card>;
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  title: { ...typography.h3, fontSize: 16, color: colors.primaryDark, marginBottom: spacing.xs },
  subtitle: { ...typography.caption, marginBottom: spacing.md, lineHeight: 18 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  fieldInfo: { flex: 1 },
  fieldName: { ...typography.bodySmall, fontWeight: '700', color: colors.primaryDark },
  coords: { ...typography.caption, marginTop: 2 },
  coordsMuted: { ...typography.caption, marginTop: 2, fontStyle: 'italic' },
  edit: { ...typography.caption, color: colors.primary, fontWeight: '600', marginRight: spacing.md },
  delete: { fontSize: 16, color: colors.textMuted, padding: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1 },
  limit: { ...typography.caption, fontStyle: 'italic', textAlign: 'center' },
});
