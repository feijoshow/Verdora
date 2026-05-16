import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenWrapper } from '../../components/ui';
import { colors, typography, spacing } from '../../constants/theme';

export function WeatherPlaceholderScreen() {
  return (
    <ScreenWrapper>
      <Text style={styles.title}>Weather Dashboard</Text>
      <Text style={styles.subtitle}>Location-based forecasts — coming soon</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.primary, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, marginTop: spacing.sm },
});
