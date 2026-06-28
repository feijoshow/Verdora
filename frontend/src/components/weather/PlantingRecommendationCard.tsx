import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlantingRecommendation } from '../../services/api/types';
import { Card } from '../ui/Card';
import { MarkdownText } from '../ui/MarkdownText';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface PlantingRecommendationCardProps {
  item: PlantingRecommendation;
}

export function PlantingRecommendationCard({ item }: PlantingRecommendationCardProps) {
  const { colors, typography } = useTheme();

  const statusConfig = useMemo(
    () => ({
      ideal: { label: 'Ideal', color: colors.success, bg: colors.surfaceAlt, emoji: '✅' },
      caution: { label: 'Caution', color: colors.secondaryDark, bg: colors.warningSurface, emoji: '⚠️' },
      avoid: { label: 'Avoid', color: colors.error, bg: colors.errorSurface, emoji: '⛔' },
    }),
    [colors],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.sm },
        row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
        badge: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.full,
          marginRight: spacing.md,
        },
        badgeEmoji: { fontSize: 14, marginRight: 4 },
        badgeLabel: { ...typography.caption, fontWeight: '700' },
        crop: { ...typography.h3, fontSize: 16, color: colors.text },
        reason: { ...typography.bodySmall, lineHeight: 20, color: colors.text },
      }),
    [colors, typography],
  );

  const config = statusConfig[item.status];

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: config.bg }]}>
          <Text style={styles.badgeEmoji}>{config.emoji}</Text>
          <Text style={[styles.badgeLabel, { color: config.color }]}>{config.label}</Text>
        </View>
        <Text style={styles.crop}>{item.cropName}</Text>
      </View>
      <MarkdownText style={styles.reason}>{item.reason}</MarkdownText>
    </Card>
  );
}
