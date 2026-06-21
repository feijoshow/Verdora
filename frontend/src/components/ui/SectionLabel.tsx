import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { spacing, typography } from '../../constants/theme';

interface SectionLabelProps extends TextProps {
  children: string;
}

export function SectionLabel({ children, style, ...rest }: SectionLabelProps) {
  return (
    <Text style={[styles.label, style]} {...rest}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.sectionLabel,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
});
