import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FarmField } from '../../types/field';
import {
  getLastSelectedFieldId,
  listFarmFields,
  setLastSelectedFieldId,
} from '../../services/fields/fieldService';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface FieldPickerProps {
  userId: string;
  value: string | null;
  onChange: (fieldId: string | null, field: FarmField | null) => void;
  label?: string;
  required?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
}

/** Select one of the farmer's registered plots */
export function FieldPicker({
  userId,
  value,
  onChange,
  label = 'Field / plot',
  required = false,
  allowNone = false,
  noneLabel = 'Whole farm',
}: FieldPickerProps) {
  const [fields, setFields] = useState<FarmField[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listFarmFields(userId);
    setFields(data);
    if (!value && data.length > 0 && !allowNone) {
      const last = await getLastSelectedFieldId(userId);
      const pick = data.find((f) => f.id === last) ?? data[0];
      onChange(pick.id, pick);
    }
    setLoading(false);
  }, [allowNone, onChange, userId, value]);

  useEffect(() => {
    load();
  }, [load]);

  const select = (field: FarmField | null) => {
    const id = field?.id ?? null;
    onChange(id, field);
    if (id) setLastSelectedFieldId(userId, id);
  };

  if (loading) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
        <Text style={styles.hint}>Loading fields…</Text>
      </View>
    );
  }

  if (fields.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
        <Text style={styles.empty}>
          No fields yet. Add plots in Profile → My fields to tag scans and calendar events.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {allowNone ? (
          <Pressable
            style={[styles.chip, !value && styles.chipActive]}
            onPress={() => select(null)}
          >
            <Text style={[styles.chipText, !value && styles.chipTextActive]}>{noneLabel}</Text>
          </Pressable>
        ) : null}
        {fields.map((field) => {
          const active = value === field.id;
          return (
            <Pressable
              key={field.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => select(field)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{field.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.sm },
  hint: { ...typography.caption, fontStyle: 'italic' },
  empty: { ...typography.caption, lineHeight: 18, color: colors.textMuted },
  row: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
  chipText: { ...typography.bodySmall, color: colors.textSecondary },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
});
