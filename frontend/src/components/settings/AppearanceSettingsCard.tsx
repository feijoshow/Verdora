import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, type ColorScheme } from '../../constants/theme';

const OPTIONS: { value: ColorScheme; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export function AppearanceSettingsCard({ embedded = false }: { embedded?: boolean }) {
  const { colors, typography, colorScheme, setColorScheme } = useTheme();

  const styles = StyleSheet.create({
    title: {
      ...typography.h3,
      fontSize: 16,
      color: colors.text,
      marginBottom: embedded ? spacing.sm : spacing.md,
    },
    body: {
      ...typography.bodySmall,
      lineHeight: 20,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    option: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionLabel: {
      ...typography.bodySmall,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    optionLabelActive: {
      color: colors.primary,
    },
  });

  return (
    <View>
      {!embedded ? <Text style={styles.title}>Appearance</Text> : null}
      <Text style={styles.body}>
        Choose light or dark mode. Buttons and text stay easy to read in both.
      </Text>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const active = colorScheme === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => setColorScheme(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Ionicons
                name={option.icon}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
