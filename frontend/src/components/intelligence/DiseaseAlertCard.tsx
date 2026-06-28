import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui';
import type { DiseaseAlert } from '../../types/analytics';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

const SEVERITY_EMOJI: Record<DiseaseAlert['severity'], string> = {
  low: '🟡',
  medium: '🟠',
  high: '🔴',
  critical: '🚨',
};

interface DiseaseAlertCardProps {
  alert: DiseaseAlert;
}

/** Admin card showing geospatial outbreak cluster with alert radius */
export function DiseaseAlertCard({ alert }: DiseaseAlertCardProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.sm },
        header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
        title: { ...typography.h3, fontSize: 15, color: colors.text, flex: 1 },
        badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
        badge_low: { backgroundColor: '#FFF8E7' },
        badge_medium: { backgroundColor: '#FFF3CD' },
        badge_high: { backgroundColor: '#FFE5D0' },
        badge_critical: { backgroundColor: '#FFD6D6' },
        badgeText: { fontSize: 10, fontWeight: '700', color: colors.text },
        stats: { ...typography.caption, marginTop: spacing.xs, fontWeight: '600', color: colors.textSecondary },
        message: { ...typography.bodySmall, marginTop: spacing.sm, lineHeight: 20, color: colors.text },
        mapPreview: { flexDirection: 'row', marginTop: spacing.md, alignItems: 'center' },
        mapCircle: {
          width: 72,
          height: 72,
          borderRadius: 36,
          borderWidth: 2,
          borderColor: colors.error,
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(193, 18, 31, 0.08)',
          marginRight: spacing.md,
        },
        mapCenter: {
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.error,
        },
        mapMeta: { flex: 1 },
        metaLine: { ...typography.caption, marginTop: 2, color: colors.textMuted },
        actionHint: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
      }),
    [colors, typography],
  );

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {SEVERITY_EMOJI[alert.severity]} {alert.disease}
        </Text>
        <View style={[styles.badge, styles[`badge_${alert.severity}`]]}>
          <Text style={styles.badgeText}>{alert.severity.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.stats}>
        {alert.scanCount} scans · {alert.radiusKm} km radius · {alert.regionLabel ?? 'Regional cluster'}
      </Text>
      <Text style={styles.message}>{alert.message}</Text>
      <View style={styles.mapPreview}>
        <View style={styles.mapCircle}>
          <View style={styles.mapCenter} />
        </View>
        <View style={styles.mapMeta}>
          <Text style={styles.metaLine}>Center: {alert.centerLat.toFixed(3)}, {alert.centerLng.toFixed(3)}</Text>
          <Text style={styles.metaLine}>Crops: {alert.cropTypes.join(', ')}</Text>
          <Text style={styles.metaLine}>
            Detected: {new Date(alert.detectedAt).toLocaleDateString()}
          </Text>
          <Text style={styles.actionHint}>→ Notify farmers within {alert.radiusKm} km</Text>
        </View>
      </View>
    </Card>
  );
}
