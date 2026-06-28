import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

export type AdminTab =
  | 'overview'
  | 'intelligence'
  | 'users'
  | 'farming'
  | 'scans'
  | 'environment'
  | 'chat';

const TABS: { id: AdminTab; label: string; emoji: string }[] = [
  { id: 'overview', label: 'Overview', emoji: '📊' },
  { id: 'intelligence', label: 'Intel', emoji: '🧠' },
  { id: 'users', label: 'Users', emoji: '👤' },
  { id: 'farming', label: 'Farming', emoji: '🌱' },
  { id: 'scans', label: 'Scans', emoji: '📷' },
  { id: 'environment', label: 'Weather', emoji: '🌦️' },
  { id: 'chat', label: 'Chat AI', emoji: '🤖' },
];

interface AdminTabBarProps {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
}

export function AdminTabBar({ active, onChange }: AdminTabBarProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: { marginBottom: spacing.md },
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          marginRight: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
        emoji: { fontSize: 14, marginRight: 4 },
        label: { ...typography.caption, fontWeight: '600', color: colors.textSecondary },
        labelActive: { color: colors.white },
      }),
    [colors, typography],
  );

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      {TABS.map((tab) => (
        <Pressable
          key={tab.id}
          style={[styles.chip, active === tab.id && styles.chipActive]}
          onPress={() => onChange(tab.id)}
        >
          <Text style={styles.emoji}>{tab.emoji}</Text>
          <Text style={[styles.label, active === tab.id && styles.labelActive]}>{tab.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
