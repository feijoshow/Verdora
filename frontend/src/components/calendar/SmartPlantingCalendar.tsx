import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { assessPlantingMonth } from '../../services/api/cropLibraryService';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

export function SmartPlantingCalendar({ crop }: { crop: any }) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        grid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.sm },
        cell: { width: '25%', padding: spacing.xs, alignItems: 'center', justifyContent: 'center' },
        cellText: { ...typography.caption, color: colors.text },
      }),
    [colors, typography],
  );

  const months = [
    'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'
  ];

  return (
    <View style={styles.grid}>
      {months.map((m, i) => {
        const idx = i + 1;
        const status = crop ? assessPlantingMonth(crop, idx) : 'avoid';
        const bg = status === 'ideal' ? colors.surfaceAlt : status === 'caution' ? colors.warningSurface : colors.surface;
        const border = status === 'ideal' ? { borderColor: colors.primary, borderWidth: 1 } : {};
        return (
          <View key={m} style={[styles.cell, { backgroundColor: bg }, border]}>
            <Text style={styles.cellText}>{m}</Text>
          </View>
        );
      })}
    </View>
  );
}
