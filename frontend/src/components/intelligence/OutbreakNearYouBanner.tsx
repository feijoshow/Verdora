import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiseaseAlert } from '../../types/analytics';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const SEVERITY_COLORS: Record<DiseaseAlert['severity'], string> = {
  low: '#FFF8E7',
  medium: '#FFF3CD',
  high: '#FFE5D0',
  critical: '#FFD6D6',
};

const SEVERITY_LABELS: Record<DiseaseAlert['severity'], string> = {
  low: 'Advisory',
  medium: 'Moderate',
  high: 'High risk',
  critical: 'Critical',
};

interface OutbreakNearYouBannerProps {
  alerts: DiseaseAlert[];
  onPress?: (alert: DiseaseAlert) => void;
}

/** Privacy-safe aggregated outbreak warning for farmers */
export function OutbreakNearYouBanner({ alerts, onPress }: OutbreakNearYouBannerProps) {
  if (alerts.length === 0) return null;

  const top = alerts[0];

  return (
    <Pressable
      style={[styles.banner, { backgroundColor: SEVERITY_COLORS[top.severity] }]}
      onPress={() => onPress?.(top)}
      accessibilityRole="button"
      accessibilityLabel={`Outbreak alert: ${top.disease}`}
    >
      <View style={styles.header}>
        <Text style={styles.emoji}>⚠️</Text>
        <View style={styles.headerText}>
          <Text style={styles.title}>Outbreak near you</Text>
          <Text style={styles.severity}>{SEVERITY_LABELS[top.severity]}</Text>
        </View>
      </View>
      <Text style={styles.message}>
        {top.disease} detected in {top.scanCount} regional scans within {top.radiusKm} km
        {top.cropTypes.length > 0 ? ` — watch your ${top.cropTypes.slice(0, 2).join(' & ')}` : ''}.
      </Text>
      <Text style={styles.hint}>Aggregated regional data · no individual farms identified</Text>
      {alerts.length > 1 ? (
        <Text style={styles.more}>+{alerts.length - 1} more alert{alerts.length > 2 ? 's' : ''} nearby</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  emoji: { fontSize: 22, marginRight: spacing.sm },
  headerText: { flex: 1 },
  title: { ...typography.bodySmall, fontWeight: '700', color: colors.secondaryDark },
  severity: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  message: { ...typography.bodySmall, lineHeight: 20, color: colors.text },
  hint: { ...typography.caption, marginTop: spacing.sm, fontStyle: 'italic', color: colors.textMuted },
  more: { ...typography.caption, marginTop: spacing.xs, fontWeight: '600', color: colors.primary },
});
