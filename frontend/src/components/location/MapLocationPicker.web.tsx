import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UseCurrentLocationButton } from './UseCurrentLocationButton';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import type { MapLocationPickerProps } from './mapLocationPickerTypes';

export function MapLocationPicker({
  value,
  onChange,
  label = 'Farm location on map',
}: MapLocationPickerProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.xs, color: colors.text },
        hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },
        selectedRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginBottom: spacing.sm,
        },
        selectedText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.selectedRow}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={styles.selectedText}>Location pinned</Text>
        </View>
      ) : (
        <Text style={styles.hint}>
          On a phone, you can pick your farm on a map. In the browser, use GPS instead.
        </Text>
      )}
      <UseCurrentLocationButton
        label={value ? 'Update GPS location' : 'Use my current location'}
        onLocation={onChange}
      />
    </View>
  );
}
