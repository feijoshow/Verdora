import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: 'row',
          backgroundColor: colors.surfaceAlt,
          borderRadius: borderRadius.md,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        },
        segment: {
          flex: 1,
          paddingVertical: spacing.sm + 2,
          alignItems: 'center',
          borderRadius: borderRadius.sm,
        },
        segmentActive: {
          backgroundColor: colors.primary,
        },
        label: {
          ...typography.bodySmall,
          fontWeight: '600',
          color: colors.textSecondary,
        },
        labelActive: {
          color: colors.onPrimary,
        },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
