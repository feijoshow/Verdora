import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui';
import type { PlantingWindowInsight } from '../../types/analytics';
import { colors, spacing, typography } from '../../constants/theme';

interface PlantingInsightCardProps {
  insight: PlantingWindowInsight;
}

/** Planting window optimization card from calendar + weather aggregation */
export function PlantingInsightCard({ insight }: PlantingInsightCardProps) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>🌾 {insight.cropName}</Text>
      <Text style={styles.region}>📍 {insight.region} · {insight.farmerCount} farmers</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>Optimal months</Text>
          <Text style={styles.value}>{insight.optimalMonths.join(', ') || '—'}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>Observed plantings</Text>
          <Text style={styles.value}>{insight.observedPlantMonths.join(', ') || '—'}</Text>
        </View>
      </View>
      {insight.avgTemperature != null ? (
        <Text style={styles.weather}>
          Avg conditions: {insight.avgTemperature}°C
          {insight.avgHumidity != null ? ` · ${insight.avgHumidity}% humidity` : ''}
        </Text>
      ) : null}
      <Text style={styles.recommendation}>{insight.recommendation}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  title: { ...typography.h3, fontSize: 15, color: colors.primaryDark },
  region: { ...typography.caption, marginTop: 4 },
  row: { flexDirection: 'row', marginTop: spacing.sm, gap: spacing.md },
  col: { flex: 1 },
  label: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
  value: { ...typography.bodySmall, marginTop: 2 },
  weather: { ...typography.caption, marginTop: spacing.sm },
  recommendation: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '600',
  },
});
