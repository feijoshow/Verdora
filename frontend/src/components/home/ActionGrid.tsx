import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ActionGridItem {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
}

interface ActionGridProps {
  items: ActionGridItem[];
}

export function ActionGrid({ items }: ActionGridProps) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <Pressable key={item.key} style={styles.tile} onPress={item.onPress}>
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tile: {
    width: '31%',
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    lineHeight: 16,
  },
});
