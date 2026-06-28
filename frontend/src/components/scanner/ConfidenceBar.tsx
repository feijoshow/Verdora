import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

interface ConfidenceBarProps {
  confidence: number;
}

export function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const { colors, typography } = useTheme();
  const percent = Math.round(confidence * 100);
  const barColor =
    percent >= 85 ? colors.success : percent >= 70 ? colors.warning : colors.secondaryDark;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginVertical: spacing.sm },
        row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
        label: { ...typography.bodySmall, fontWeight: '600', color: colors.text },
        value: { ...typography.bodySmall, fontWeight: '700', color: colors.primary },
        track: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        },
        fill: { height: '100%', borderRadius: borderRadius.full },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Text style={styles.label}>Confidence</Text>
        <Text style={styles.value}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}
