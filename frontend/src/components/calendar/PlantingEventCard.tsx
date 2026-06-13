import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlantingEvent } from '../../types';
import { formatPlantingLine } from '../../utils/plantingFormat';
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
  const headline = formatPlantingLine(event);

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headline}>{headline}</Text>
          <Pressable onPress={onDelete} hitSlop={8}>
            <Text style={styles.delete}>✕</Text>
          </Pressable>
        </View>
        {event.harvestDate ? (
          <View style={styles.dates}>
            <Text style={styles.dateLabel}>Harvest</Text>
            <Text style={styles.dateValue}>{formatDate(event.harvestDate)}</Text>
          </View>
        ) : null}
        {event.notes ? (
          <Text style={styles.guideNotes} numberOfLines={3}>{event.notes}</Text>
        ) : null}
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  content: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  headline: { ...typography.h3, fontSize: 16, color: colors.primaryDark, flex: 1, lineHeight: 22 },
  delete: { fontSize: 18, color: colors.textMuted, padding: spacing.xs },
  dates: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 4 },
  dateLabel: { ...typography.caption, fontWeight: '600' },
  dateValue: { ...typography.bodySmall, color: colors.primary },
  guideNotes: { ...typography.caption, marginTop: spacing.sm, lineHeight: 18, color: colors.textSecondary },
});
