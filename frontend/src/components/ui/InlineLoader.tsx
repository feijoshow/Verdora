import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

interface InlineLoaderProps {
  size?: 'small' | 'large';
  style?: ViewStyle;
}

/** Centered spinner for section-level loading inside a screen. */
export function InlineLoader({ size = 'small', style }: InlineLoaderProps) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xl,
        },
      }),
    [],
  );

  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator size={size} color={colors.primary} />
    </View>
  );
}
