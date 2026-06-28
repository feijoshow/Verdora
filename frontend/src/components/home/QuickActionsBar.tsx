import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface QuickAction {
  key: string;
  icon: IconName;
  label: string;
  tint: string;
  onPress: () => void;
}

interface QuickActionsBarProps {
  actions: QuickAction[];
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          gap: spacing.sm,
          paddingBottom: spacing.lg,
        },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: borderRadius.full,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        label: {
          ...typography.bodySmall,
          fontWeight: '600',
          color: colors.text,
        },
      }),
    [colors, typography],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {actions.map((action) => (
        <Pressable key={action.key} style={styles.chip} onPress={action.onPress}>
          <Ionicons name={action.icon} size={20} color={action.tint} />
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
