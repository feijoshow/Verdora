import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenWrapper } from '../../components/ui';
import { colors, typography, spacing } from '../../constants/theme';

export function CalendarPlaceholderScreen() {
  return (
    <ScreenWrapper>
      <Text style={styles.title}>Plantation Calendar</Text>
      <Text style={styles.subtitle}>Planting schedules & events — coming soon</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.primary, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, marginTop: spacing.sm },
});
