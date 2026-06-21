import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { OutbreakNearYouBanner } from '../../components/intelligence/OutbreakNearYouBanner';
import { NavCard } from '../../components/navigation/NavCard';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Card, EmptyState, InlineLoader, ScreenWrapper, SectionLabel } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { getFarmerSummary, type FarmerSummary } from '../../services/data/farmerDataService';
import { getFarmerNearbyAlerts } from '../../services/intelligence/intelligenceService';
import type { DiseaseAlert } from '../../types/analytics';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import type { FarmerStackParamList, FarmerTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<FarmerTabParamList, 'Home'>,
  NativeStackScreenProps<FarmerStackParamList>
>;

function StatPill({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string }) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={14} color={colors.primary} />
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<FarmerSummary | null>(null);
  const [nearbyAlerts, setNearbyAlerts] = useState<DiseaseAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [data, alerts] = await Promise.all([
      getFarmerSummary(user),
      getFarmerNearbyAlerts(user),
    ]);
    setSummary(data);
    setNearbyAlerts(alerts);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const parentNav = navigation.getParent();
  const firstName = user?.name?.split(' ')[0] ?? 'Farmer';

  return (
    <ScreenWrapper>
      <ScreenHeader
        banner
        title={`Hello, ${firstName}`}
        subtitle={user?.location ? user.location : 'Set your location in Profile for local advice'}
      />

      <Pressable onPress={() => navigation.navigate('Profile')} style={styles.profileLink}>
        <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.profileLinkText}>Profile & privacy</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>

      <OutbreakNearYouBanner
        alerts={nearbyAlerts}
        onPress={(alert) =>
          Alert.alert(
            'Regional outbreak alert',
            `${alert.message}\n\nThis is aggregated regional data — individual farms are not identified.`,
          )
        }
      />

      {loading ? (
        <InlineLoader />
      ) : summary ? (
        <Card variant="elevated" style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Ionicons name="leaf" size={18} color={colors.primary} />
            <Text style={styles.statsTitle}>Your farm</Text>
          </View>
          {summary.crops.length > 0 ? (
            <Text style={styles.crops}>Growing: {summary.crops.join(', ')}</Text>
          ) : (
            <Text style={styles.cropsMuted}>Add crops in Calendar to unlock scan & weather insights</Text>
          )}
          <View style={styles.statsRow}>
            <StatPill icon="camera-outline" label={`${summary.scanCount} scans`} />
            <StatPill icon="calendar-outline" label={`${summary.calendarEventCount} events`} />
          </View>
        </Card>
      ) : (
        <EmptyState
          message="Could not load your farm summary. Pull down to refresh."
          variant="muted"
          style={styles.statsCard}
        />
      )}

      <SectionLabel>Quick access</SectionLabel>
      <NavCard
        icon="camera"
        title="Crop Scanner"
        description="Scan or upload — AI identifies crop & disease"
        onPress={() => navigation.navigate('Scanner')}
      />
      <NavCard
        icon="calendar"
        title="Plantation Calendar"
        description="Planting & harvest schedule"
        onPress={() => navigation.navigate('Calendar')}
      />
      <NavCard
        icon="library"
        title="Crop Library"
        description="Seasons, spacing, and planting guidance"
        onPress={() => parentNav?.navigate('CropLibrary')}
      />
      <NavCard
        icon="partly-sunny"
        title="Weather"
        description={`Forecasts for ${user?.location?.split(',')[0] ?? 'your area'}`}
        onPress={() => navigation.navigate('Weather')}
      />
      <NavCard
        icon="chatbubbles"
        title="Farming Assistant"
        description="Ask questions — answers use your farm data"
        onPress={() => navigation.navigate('Chat')}
      />

      {summary && summary.recentScans.length > 0 ? (
        <>
          <SectionLabel>Latest scan</SectionLabel>
          <Pressable
            onPress={() =>
              parentNav?.navigate('DiagnosisResults', { result: summary.recentScans[0] })
            }
          >
            <Card variant="highlight">
              <Text style={styles.scanCrop}>{summary.recentScans[0].cropName}</Text>
              <Text style={styles.scanMeta}>
                {summary.recentScans[0].disease ?? 'Healthy'} · Tap for details
              </Text>
            </Card>
          </Pressable>
        </>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
    alignSelf: 'flex-start',
  },
  profileLinkText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  statsCard: { marginBottom: spacing.sm },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statsTitle: { ...typography.h3, fontSize: 16, color: colors.primaryDark },
  crops: { ...typography.bodySmall, lineHeight: 22 },
  cropsMuted: { ...typography.caption, fontStyle: 'italic', lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statPillText: { ...typography.caption, color: colors.primaryDark, fontWeight: '600' },
  scanCrop: { ...typography.h3, fontSize: 16, color: colors.primary },
  scanMeta: { ...typography.caption, marginTop: 4 },
});
