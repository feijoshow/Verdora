import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { ScreenWrapper } from '../../components/ui';
import { colors, typography, spacing } from '../../constants/theme';

export function ChatPlaceholderScreen() {
  return (
    <ScreenWrapper>
      <Text style={styles.title}>Farming Assistant</Text>
      <Text style={styles.subtitle}>Gemini-powered chat — coming soon</Text>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.primary, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, marginTop: spacing.sm },
});
