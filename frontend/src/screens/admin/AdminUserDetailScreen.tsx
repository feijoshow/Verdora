import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Button, Card, EmptyState, ScreenLoader, ScreenWrapper } from '../../components/ui';
import { exportFarmerReport } from '../../services/api/adminService';
import {
  deleteFarmerAccount,
  setFarmerAccountActive,
} from '../../services/admin/adminOperationsService';
import { getUserActivityProfile } from '../../services/admin/userActivityService';
import { toApiError } from '../../services/api/errors';
import type { UserActivityProfile } from '../../types/analytics';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import type { AdminStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'UserDetail'>;

export function AdminUserDetailScreen({ route }: Props) {
  const { userId } = route.params;
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const [profile, setProfile] = useState<UserActivityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'pdf' | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const [error, setError] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        consentCard: { marginBottom: spacing.md },
        consentTitle: { ...typography.bodySmall, fontWeight: '700', marginBottom: spacing.xs, color: colors.text },
        consentBody: { ...typography.caption, lineHeight: 18, color: colors.textSecondary },
        statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        sectionTitle: { ...typography.h3, marginBottom: spacing.sm, color: colors.text },
        exportRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
        exportBtn: { flex: 1 },
        accountRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
        accountBtn: { flex: 1 },
        dangerBtn: { marginBottom: spacing.lg },
        statusBadge: {
          ...typography.caption,
          fontWeight: '700',
          marginTop: spacing.xs,
          color: colors.textSecondary,
        },
        statusInactive: { color: colors.error },
        itemCard: { marginBottom: spacing.sm },
        itemTitle: { ...typography.h3, fontSize: 15, color: colors.text },
        itemMeta: { ...typography.caption, marginTop: 4, color: colors.textMuted },
        itemBody: { ...typography.bodySmall, marginTop: spacing.sm, lineHeight: 20, color: colors.text },
        scanImage: {
          width: '100%',
          height: 140,
          borderRadius: borderRadius.md,
          marginBottom: spacing.sm,
        },
        chatLabel: {
          ...typography.caption,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.4,
          marginTop: spacing.xs,
          color: colors.textMuted,
        },
        chatQuestion: { ...typography.bodySmall, fontWeight: '600', marginTop: 4, lineHeight: 20, color: colors.text },
        chatAnswer: { ...typography.bodySmall, marginTop: 4, lineHeight: 20, color: colors.textSecondary },
      }),
    [colors, typography],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getUserActivityProfile(userId);
        if (!data) {
          setError('Farmer not found');
          setProfile(null);
        } else {
          setProfile(data);
        }
      } catch (err) {
        setError(toApiError(err).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleActive = () => {
    if (!profile) return;
    const isActive = profile.user.isActive !== false;
    const nextActive = !isActive;
    Alert.alert(
      nextActive ? 'Reactivate account' : 'Deactivate account',
      nextActive
        ? `${profile.user.name} will be able to sign in again.`
        : `${profile.user.name} will not be able to sign in until reactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: nextActive ? 'Reactivate' : 'Deactivate',
          style: nextActive ? 'default' : 'destructive',
          onPress: async () => {
            setAccountBusy(true);
            try {
              await setFarmerAccountActive(userId, nextActive);
              await load(true);
              Alert.alert('Updated', nextActive ? 'Account reactivated.' : 'Account deactivated.');
            } catch (err) {
              Alert.alert('Could not update account', toApiError(err).message);
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (!profile) return;
    Alert.alert(
      'Delete account permanently',
      `This removes ${profile.user.name}'s login and all linked data. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setAccountBusy(true);
            try {
              await deleteFarmerAccount(userId);
              Alert.alert('Account deleted', 'The farmer account was removed.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Delete failed', toApiError(err).message);
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleExport = async (format: 'json' | 'pdf') => {
    setExportingFormat(format);
    try {
      const report = await exportFarmerReport(userId, format);
      const formatLabel = format === 'pdf' ? 'PDF report' : 'JSON file';
      Alert.alert(
        'Export complete',
        Platform.OS === 'web'
          ? `${report.filename} downloaded (${report.recordCount} records, ${formatLabel})`
          : `${report.filename}\n${report.recordCount} records (${formatLabel})\nSaved — use the share sheet to save or send the file.`,
      );
    } catch (err) {
      Alert.alert('Export failed', toApiError(err).message);
    } finally {
      setExportingFormat(null);
    }
  };

  if (loading && !profile) {
    return (
      <ScreenLoader
        header={<ScreenHeader title="Farmer activity" showBack />}
        label="Loading farmer profile…"
      />
    );
  }

  if (error || !profile) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Farmer activity" showBack />
        <EmptyState message={error || 'No data available'} variant="error" />
      </ScreenWrapper>
    );
  }

  const { user, scans, farmingRecords, environmentLogs, chatQuestions, stats } = profile;

  return (
    <ScreenWrapper
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
    >
      <ScreenHeader
        title={user.name || 'Farmer'}
        subtitle={`${user.email} · ${user.location ?? 'No location'}`}
        showBack
      />

      <Card variant="highlight" style={styles.consentCard}>
        <Text style={styles.consentTitle}>
          {user.dataConsent ? 'Data collection consented' : 'No data consent on file'}
        </Text>
        <Text style={styles.consentBody}>
          {user.dataConsent
            ? 'This farmer opted in — all activity below was collected with their permission.'
            : 'Limited profile data only. Activity may be incomplete.'}
        </Text>
        <Text
          style={[
            styles.statusBadge,
            user.isActive === false && styles.statusInactive,
          ]}
        >
          Account status: {user.isActive === false ? 'Deactivated' : 'Active'}
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>Account management</Text>
      <View style={styles.accountRow}>
        <Button
          title={user.isActive === false ? 'Reactivate' : 'Deactivate'}
          variant="outline"
          onPress={handleToggleActive}
          loading={accountBusy}
          style={styles.accountBtn}
        />
        <Button
          title="Delete account"
          variant="secondary"
          onPress={handleDeleteAccount}
          disabled={accountBusy}
          style={styles.accountBtn}
        />
      </View>

      <View style={styles.statGrid}>
        <StatPill label="Scans" value={stats.scanCount} />
        <StatPill label="Calendar" value={stats.farmingCount} />
        <StatPill label="Chat" value={stats.chatCount} />
        <StatPill label="Weather" value={stats.environmentCount} />
      </View>

      <Text style={styles.sectionTitle}>Export this farmer</Text>
      <View style={styles.exportRow}>
        <Button
          title="Export PDF"
          variant="primary"
          onPress={() => handleExport('pdf')}
          loading={exportingFormat === 'pdf'}
          disabled={exportingFormat !== null && exportingFormat !== 'pdf'}
          style={styles.exportBtn}
        />
        <Button
          title="Export JSON"
          variant="outline"
          onPress={() => handleExport('json')}
          loading={exportingFormat === 'json'}
          disabled={exportingFormat !== null && exportingFormat !== 'json'}
          style={styles.exportBtn}
        />
      </View>

      <Section title="Profile">
        <Card>
          <Meta label="Farmer type" value={user.farmerType ?? '—'} />
          <Meta label="Farm size" value={user.farmSize ?? '—'} />
          <Meta label="Region" value={user.region ?? '—'} />
          <Meta label="Village" value={user.village ?? '—'} />
          <Meta label="Soil type" value={user.soilType ?? '—'} />
          <Meta label="Methods" value={user.farmingMethods?.join(', ') || '—'} />
          <Meta label="Crops" value={user.cropsPlanted?.join(', ') || 'None'} />
          <Meta label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
        </Card>
      </Section>

      <Section title={`Crop scans (${scans.length})`}>
        {scans.length === 0 ? (
          <EmptyState message="No crop scans recorded yet." variant="muted" />
        ) : (
          scans.map((s) => (
            <Card key={s.id} style={styles.itemCard}>
              {s.imageUri ? (
                <Image source={{ uri: s.imageUri }} style={styles.scanImage} />
              ) : null}
              <Text style={styles.itemTitle}>
                {s.cropType} — {s.disease ?? 'Healthy'}
              </Text>
              <Text style={styles.itemMeta}>
                {Math.round(s.confidence * 100)}% confidence · {new Date(s.timestamp).toLocaleString()}
              </Text>
              <Text style={styles.itemBody}>{s.treatment}</Text>
            </Card>
          ))
        )}
      </Section>

      <Section title={`Plantation calendar (${farmingRecords.length})`}>
        {farmingRecords.length === 0 ? (
          <EmptyState message="No planting events recorded." variant="muted" />
        ) : (
          farmingRecords.map((r) => (
            <Card key={r.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{r.cropName}</Text>
              <Text style={styles.itemMeta}>
                Plant {r.plantDate}
                {r.harvestDate ? ` → Harvest ${r.harvestDate}` : ''}
              </Text>
              {r.fieldName ? <Text style={styles.itemMeta}>Field: {r.fieldName}</Text> : null}
              {r.soilType ? <Text style={styles.itemMeta}>Soil: {r.soilType}</Text> : null}
            </Card>
          ))
        )}
      </Section>

      <Section title={`Weather checks (${environmentLogs.length})`}>
        {environmentLogs.length === 0 ? (
          <EmptyState message="No weather logs recorded." variant="muted" />
        ) : (
          environmentLogs.map((e) => (
            <Card key={e.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{e.condition}</Text>
              <Text style={styles.itemMeta}>
                {e.temperature}°C · {e.humidity}% humidity · {e.location}
              </Text>
              <Text style={styles.itemMeta}>{new Date(e.timestamp).toLocaleString()}</Text>
            </Card>
          ))
        )}
      </Section>

      <Section title={`Chat history (${chatQuestions.length})`}>
        {chatQuestions.length === 0 ? (
          <EmptyState message="No chat questions recorded." variant="muted" />
        ) : (
          chatQuestions.map((c) => (
            <Card key={c.id} style={styles.itemCard}>
              <Text style={styles.chatLabel}>Farmer asked</Text>
              <Text style={styles.chatQuestion}>{c.question}</Text>
              {c.aiResponse ? (
                <>
                  <Text style={styles.chatLabel}>Assistant replied</Text>
                  <Text style={styles.chatAnswer}>{c.aiResponse}</Text>
                </>
              ) : null}
              <Text style={styles.itemMeta}>{new Date(c.timestamp).toLocaleString()}</Text>
            </Card>
          ))
        )}
      </Section>
    </ScreenWrapper>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: spacing.md },
        sectionTitle: { ...typography.h3, marginBottom: spacing.sm, color: colors.text },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        pill: {
          width: '47%',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          padding: spacing.sm,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
        },
        pillValue: { fontSize: 20, fontWeight: '700', color: colors.primary },
        pillLabel: { ...typography.caption, color: colors.textMuted },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.pill}>
      <Text style={styles.pillValue}>{value}</Text>
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        metaRow: { ...typography.bodySmall, marginBottom: spacing.xs, color: colors.text },
        metaLabel: { fontWeight: '700', color: colors.text },
      }),
    [colors, typography],
  );

  return (
    <Text style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}: </Text>
      {value}
    </Text>
  );
}
