import React, { useMemo } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

interface SectionLabelProps extends TextProps {
  children: string;
}

export function SectionLabel({ children, style, ...rest }: SectionLabelProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        label: {
          ...typography.sectionLabel,
          marginTop: spacing.lg,
          marginBottom: spacing.sm,
          color: colors.textSecondary,
        },
      }),
    [colors, typography],
  );

  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}
