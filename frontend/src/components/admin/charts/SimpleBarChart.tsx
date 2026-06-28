import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { borderRadius, spacing } from '../../../constants/theme';

export interface BarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  items: BarChartItem[];
  unit?: string;
}

export function SimpleBarChart({ title, items, unit = '' }: SimpleBarChartProps) {
  const { colors, typography } = useTheme();
  const maxValue = Math.max(...items.map((i) => i.value), 1);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.md },
        title: { ...typography.bodySmall, fontWeight: '700', marginBottom: spacing.sm, color: colors.text },
        row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
        label: { width: 110, ...typography.caption, color: colors.textSecondary },
        track: {
          flex: 1,
          height: 14,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        },
        fill: { height: '100%', borderRadius: borderRadius.full },
        value: { width: 44, ...typography.caption, fontWeight: '700', textAlign: 'right', color: colors.text },
      }),
    [colors, typography],
  );

  if (items.length === 0) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={{ ...typography.caption, color: colors.textMuted }}>No data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item) => {
        const widthPct = Math.max(8, Math.round((item.value / maxValue) * 100));
        return (
          <View key={item.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${widthPct}%`,
                    backgroundColor: item.color ?? colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>
              {item.value}
              {unit}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
