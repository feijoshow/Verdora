import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Card, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../constants/theme';
import type { FarmerTabParamList } from '../../navigation/types';

type Props = BottomTabScreenProps<FarmerTabParamList, 'Home'>;

const QUICK_ACTIONS = [
  { emoji: '📷', label: 'Scan Crop', screen: 'Scanner' as const },
  { emoji: '📅', label: 'Calendar', screen: 'Calendar' as const },
  { emoji: '🌦️', label: 'Weather', screen: 'Weather' as const },
  { emoji: '🤖', label: 'AI Chat', screen: 'Chat' as const },
];

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name ?? 'Farmer'}</Text>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      <Card variant="highlight" style={styles.hero}>
        <Text style={styles.heroTitle}>Grow smarter with Verdora</Text>
        <Text style={styles.heroText}>
          Scan crops, track planting schedules, and get weather-aware recommendations.
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.screen}
            style={styles.actionCard}
            onPress={() => navigation.navigate(action.screen)}
          >
            <Text style={styles.actionEmoji}>{action.emoji}</Text>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  greeting: { ...typography.bodySmall },
  name: { ...typography.h2, color: colors.primary },
  logout: { ...typography.bodySmall, color: colors.secondaryDark },
  hero: { marginBottom: spacing.lg },
  heroTitle: { ...typography.h3, color: colors.primaryDark, marginBottom: spacing.sm },
  heroText: { ...typography.bodySmall },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actionCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionEmoji: { fontSize: 32, marginBottom: spacing.sm },
  actionLabel: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
});
