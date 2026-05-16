import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlantingEvent } from '../../types';
import { Card } from '../ui/Card';
import { colors, spacing, typography } from '../../constants/theme';

interface PlantingEventCardProps {
  event: PlantingEvent;
  onPress: () => void;
  onDelete: () => void;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PlantingEventCard({ event, onPress, onDelete }: PlantingEventCardProps) {
  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.crop}>🌾 {event.cropName}</Text>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={styles.delete}>✕</Text>
          </Pressable>
        </View>
        {event.fieldName ? (
          <Text style={styles.field}>{event.fieldName}</Text>
        ) : null}
        <View style={styles.dates}>
          <Text style={styles.dateLabel}>Plant</Text>
          <Text style={styles.dateValue}>{formatDate(event.plantDate)}</Text>
          {event.harvestDate ? (
            <>
              <Text style={styles.dateSep}>→</Text>
              <Text style={styles.dateLabel}>Harvest</Text>
              <Text style={styles.dateValue}>{formatDate(event.harvestDate)}</Text>
            </>
          ) : null}
        </View>
        {event.notes ? <Text style={styles.notes} numberOfLines={2}>{event.notes}</Text> : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  content: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  crop: { ...typography.h3, fontSize: 17, color: colors.primaryDark },
  delete: { fontSize: 18, color: colors.textMuted, padding: spacing.xs },
  field: { ...typography.caption, marginTop: 2 },
  dates: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  dateLabel: { ...typography.caption, fontWeight: '600' },
  dateValue: { ...typography.bodySmall, color: colors.primary, marginRight: spacing.sm },
  dateSep: { ...typography.caption, marginHorizontal: spacing.xs },
  notes: { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic' },
});
