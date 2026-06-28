import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../../constants/theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'elevated' | 'highlight';
}

export function Card({ children, variant = 'default', style, ...rest }: CardProps) {
  return (
    <View style={[styles.card, styles[variant], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  default: {},
  elevated: {
    ...shadows.card,
    borderWidth: 0,
    borderRadius: borderRadius.xl,
  },
  highlight: {
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
  },
});
