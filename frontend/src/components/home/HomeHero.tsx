import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

interface HomeHeroProps {
  cropCount?: number;
  scanCount?: number;
}

export function HomeHero({ cropCount = 0, scanCount = 0 }: HomeHeroProps) {
  const { colors, typography } = useTheme();
  const hasStats = cropCount > 0 || scanCount > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
          paddingTop: spacing.xs,
        },
        brandRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        brand: {
          fontSize: 22,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: -0.4,
        },
        stats: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
        stat: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
        statDivider: { ...typography.caption, color: colors.textMuted },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.brandRow}>
        <Ionicons name="leaf" size={20} color={colors.primary} />
        <Text style={styles.brand}>Verdora</Text>
      </View>
      {hasStats ? (
        <View style={styles.stats}>
          {cropCount > 0 ? (
            <Text style={styles.stat}>{cropCount} crops</Text>
          ) : null}
          {cropCount > 0 && scanCount > 0 ? (
            <Text style={styles.statDivider}>·</Text>
          ) : null}
          {scanCount > 0 ? (
            <Text style={styles.stat}>{scanCount} scans</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
