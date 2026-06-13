import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, ScreenWrapper, Button } from '../../components/ui';
import { AdminTabBar, type AdminTab } from '../../components/admin/AdminTabBar';
import { useAuth } from '../../context/AuthContext';
import { exportUserReport, getAdminDashboard } from '../../services/api/adminService';
import { isSupabaseConfigured } from '../../services/supabase/client';
import { toApiError } from '../../services/api/errors';
import { DiseaseAlertCard } from '../../components/intelligence/DiseaseAlertCard';
import { KnowledgeGapCard } from '../../components/intelligence/KnowledgeGapCard';
import { PlantingInsightCard } from '../../components/intelligence/PlantingInsightCard';
import type { AdminDashboardInsights } from '../../types/analytics';
import type { AdminStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../constants/theme';

export function AdminDashboardScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { logout } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminDashboardInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'json' | 'pdf' | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const insights = await getAdminDashboard();
      setData(insights);
    } catch (err) {
      Alert.alert('Error', toApiError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async (format: 'json' | 'pdf') => {
    setExportingFormat(format);
    try {
      const report = await exportUserReport(format);
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

  if (loading && !data) {
    return (
      <ScreenWrapper scrollable={false}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </ScreenWrapper>
    );
  }

  if (!data) return null;

  const farmers = data.users.filter((u) => u.role === 'farmer');

  return (
    <ScreenWrapper
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Data Intelligence</Text>
          <Text style={styles.subtitle}>
            {isSupabaseConfigured() ? '☁️ Supabase + local analytics' : '📱 Local analytics only'}
          </Text>
        </View>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      <AdminTabBar active={tab} onChange={setTab} />

      {tab === 'overview' && (
        <>
          {data.summary.totalFarmers === 0 ? (
            <Card variant="highlight" style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No data collected yet</Text>
              <Text style={styles.emptyBody}>
                Farmers must register, add calendar events, scan crops, use weather, and chat.
                Data appears here in real time as they use the app.
              </Text>
            </Card>
          ) : null}
          <View style={styles.statGrid}>
            <StatBox label="Farmers" value={data.summary.totalFarmers} />
            <StatBox label="Crop scans" value={data.summary.totalScans} />
            <StatBox label="Farming records" value={data.summary.totalFarmingRecords} />
            <StatBox label="Chat questions" value={data.summary.totalChatQuestions} />
          </View>
          <Card variant="highlight">
            <Text style={styles.cardTitle}>Regional intelligence (aggregated only)</Text>
            <Text style={styles.cardBody}>
              Enables disease outbreak detection, crop trends, optimal planting windows, and farmer
              behavior analysis. Personal data is never sold — only aggregated reports.
            </Text>
          </Card>
          {data.regionalIntelligence.diseaseAlerts[0] ? (
            <Card style={styles.alertCard}>
              <Text style={styles.alertTitle}>🗺️ Active outbreak cluster</Text>
              <Text style={styles.alertBody}>
                {data.regionalIntelligence.diseaseAlerts[0].disease} —{' '}
                {data.regionalIntelligence.diseaseAlerts[0].scanCount} scans within{' '}
                {data.regionalIntelligence.diseaseAlerts[0].radiusKm} km
              </Text>
              <Pressable onPress={() => setTab('intelligence')}>
                <Text style={styles.link}>View intelligence dashboard →</Text>
              </Pressable>
            </Card>
          ) : data.diseaseOutbreaks[0] ? (
            <Card style={styles.alertCard}>
              <Text style={styles.alertTitle}>⚠️ Trending disease</Text>
              <Text style={styles.alertBody}>
                {data.diseaseOutbreaks[0].disease} — {data.diseaseOutbreaks[0].count} cases in{' '}
                {data.diseaseOutbreaks[0].locations.join(', ')}
              </Text>
            </Card>
          ) : null}
          {data.chatInsights[0] ? (
            <Card>
              <Text style={styles.cardTitle}>👀 Top market signal (chat)</Text>
              <Text style={styles.cardBody}>
                “{data.chatInsights[0].sampleQuestion}” — {data.chatInsights[0].questionCount}{' '}
                similar questions
              </Text>
            </Card>
          ) : null}
        </>
      )}

      {tab === 'intelligence' && (
        <>
          <Card variant="highlight">
            <Text style={styles.cardTitle}>Actionable regional intelligence</Text>
            <Text style={styles.cardBody}>
              Geospatial outbreak clusters, knowledge gaps for extension services, and planting
              window optimization from aggregated farmer data.
              {data.regionalIntelligence.lastAggregatedAt
                ? ` Last computed: ${new Date(data.regionalIntelligence.lastAggregatedAt).toLocaleString()}.`
                : ''}
            </Text>
          </Card>

          <Text style={styles.section}>Disease alerts (heat map clusters)</Text>
          {data.regionalIntelligence.diseaseAlerts.length === 0 ? (
            <Card>
              <Text style={styles.itemMeta}>
                No geospatial clusters yet — need 3+ disease scans within 50 km.
              </Text>
            </Card>
          ) : (
            data.regionalIntelligence.diseaseAlerts.map((alert) => (
              <DiseaseAlertCard key={alert.id} alert={alert} />
            ))
          )}

          <Text style={styles.section}>Knowledge gap reports (NGO / extension)</Text>
          {data.regionalIntelligence.knowledgeGaps.length === 0 ? (
            <Card>
              <Text style={styles.itemMeta}>No knowledge gaps detected yet.</Text>
            </Card>
          ) : (
            data.regionalIntelligence.knowledgeGaps.map((gap) => (
              <KnowledgeGapCard key={gap.id} report={gap} />
            ))
          )}

          <Text style={styles.section}>Planting window optimization</Text>
          {data.regionalIntelligence.plantingInsights.length === 0 ? (
            <Card>
              <Text style={styles.itemMeta}>
                Add calendar events and weather logs to generate planting insights.
              </Text>
            </Card>
          ) : (
            data.regionalIntelligence.plantingInsights.map((insight) => (
              <PlantingInsightCard key={insight.id} insight={insight} />
            ))
          )}
        </>
      )}

      {tab === 'users' && (
        <>
          <Text style={styles.section}>Segmentation by farmer type</Text>
          <View style={styles.statGrid}>
            {Object.entries(data.segments.byFarmerType).map(([type, count]) => (
              <StatBox key={type} label={type} value={count} />
            ))}
          </View>
          <Text style={styles.section}>By location</Text>
          {data.segments.byLocation.map((seg) => (
            <Card key={seg.location} style={styles.itemCard}>
              <Text style={styles.itemTitle}>📍 {seg.location}</Text>
              <Text style={styles.itemMeta}>{seg.userCount} farmers</Text>
              <Text style={styles.itemMeta}>
                {Object.entries(seg.farmerTypes)
                  .map(([t, c]) => `${t}: ${c}`)
                  .join(' · ')}
              </Text>
            </Card>
          ))}
          <Text style={styles.section}>User profiles ({farmers.length})</Text>
          <Text style={styles.hint}>Tap a farmer to view their full activity history</Text>
          {farmers.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => navigation.navigate('UserDetail', { userId: u.id })}
            >
              <Card style={styles.itemCard}>
                <Text style={styles.itemTitle}>{u.name || 'Unnamed'}</Text>
                <Text style={styles.itemMeta}>{u.email}</Text>
                <Text style={styles.itemMeta}>📍 {u.location}</Text>
                <Text style={styles.itemMeta}>
                  {u.farmerType ?? '—'} · {u.farmSize ?? 'Farm size N/A'}
                </Text>
                <Text style={styles.itemMeta}>
                  Soil: {u.soilType ?? '—'} · Methods: {u.farmingMethods?.join(', ') || '—'}
                </Text>
                <Text style={styles.itemMeta}>Crops: {u.cropsPlanted?.join(', ') || 'None'}</Text>
                <Text style={styles.itemMeta}>
                  Data consent: {u.dataConsent ? '✓ Opted in' : '✗ Opted out'}
                </Text>
                <Text style={styles.tapHint}>View scans, chat, calendar & weather →</Text>
              </Card>
            </Pressable>
          ))}
        </>
      )}

      {tab === 'farming' && (
        <>
          <Text style={styles.section}>Farming data ({data.farmingData.length})</Text>
          <Text style={styles.hint}>Plantation dates, harvest dates, soil & methods</Text>
          {data.farmingData.map((r) => (
            <Card key={`${r.userId}-${r.id}`} style={styles.itemCard}>
              <Text style={styles.itemTitle}>🌾 {r.cropName}</Text>
              <Text style={styles.itemMeta}>📍 {r.location}</Text>
              <Text style={styles.itemMeta}>
                Plant: {r.plantDate}
                {r.harvestDate ? ` → Harvest: ${r.harvestDate}` : ''}
              </Text>
              <Text style={styles.itemMeta}>Soil: {r.soilType ?? '—'}</Text>
              <Text style={styles.itemMeta}>
                Methods: {r.farmingMethods?.join(', ') || '—'}
              </Text>
              {r.fieldName ? <Text style={styles.itemMeta}>Field: {r.fieldName}</Text> : null}
            </Card>
          ))}
        </>
      )}

      {tab === 'scans' && (
        <>
          <Text style={styles.section}>Disease outbreaks</Text>
          {data.diseaseOutbreaks.length === 0 ? (
            <Card><Text style={styles.itemMeta}>No diseases detected yet</Text></Card>
          ) : (
            data.diseaseOutbreaks.map((o) => (
              <Card key={o.disease} style={styles.itemCard}>
                <Text style={styles.itemTitle}>🦠 {o.disease}</Text>
                <Text style={styles.itemMeta}>{o.count} detections</Text>
                <Text style={styles.itemMeta}>Locations: {o.locations.join(', ')}</Text>
                <Text style={styles.itemMeta}>Crops: {o.cropsAffected.join(', ')}</Text>
              </Card>
            ))
          )}
          <Text style={styles.section}>Recent crop scans</Text>
          {data.cropScans.map((s) => (
            <Card key={s.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>
                {s.cropType} — {s.disease ?? 'Healthy'}
              </Text>
              <Text style={styles.itemMeta}>
                {s.userName} · {s.location}
              </Text>
              <Text style={styles.itemMeta}>
                {Math.round(s.confidence * 100)}% confidence ·{' '}
                {new Date(s.timestamp).toLocaleString()}
              </Text>
            </Card>
          ))}
        </>
      )}

      {tab === 'environment' && (
        <>
          <View style={styles.statGrid}>
            <StatBox label="Avg temp" value={`${data.environmentSummary.avgTemperature}°C`} />
            <StatBox label="Avg humidity" value={`${data.environmentSummary.avgHumidity}%`} />
            <StatBox label="Logs" value={data.summary.totalEnvironmentLogs} />
          </View>
          <Text style={styles.section}>Common conditions</Text>
          {data.environmentSummary.topConditions.map((c) => (
            <Card key={c.condition} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{c.condition}</Text>
              <Text style={styles.itemMeta}>{c.count} readings</Text>
            </Card>
          ))}
          <Text style={styles.section}>Recent environmental logs</Text>
          {data.environmentLogs.map((e) => (
            <Card key={e.id} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{e.location}</Text>
              <Text style={styles.itemMeta}>
                {e.temperature}°C · {e.humidity}% humidity · {e.condition}
              </Text>
              <Text style={styles.itemMeta}>{new Date(e.timestamp).toLocaleString()}</Text>
            </Card>
          ))}
        </>
      )}

      {tab === 'chat' && (
        <>
          <Card variant="highlight">
            <Text style={styles.cardTitle}>Hidden gold — market signals</Text>
            <Text style={styles.cardBody}>
              Clustered farmer questions reveal knowledge gaps and product opportunities.
            </Text>
          </Card>
          <Text style={styles.section}>Topic insights</Text>
          {data.chatInsights.map((insight) => (
            <Card key={insight.topic} style={styles.itemCard}>
              <Text style={styles.itemTitle}>{insight.topic}</Text>
              <Text style={styles.itemMeta}>{insight.questionCount} questions</Text>
              <Text style={styles.itemMeta} numberOfLines={2}>
                Example: “{insight.sampleQuestion}”
              </Text>
              <Text style={styles.itemMeta}>Regions: {insight.locations.join(', ')}</Text>
            </Card>
          ))}
        </>
      )}

      <Text style={styles.section}>Export data</Text>
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
    </ScreenWrapper>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  title: { ...typography.h2, color: colors.primary },
  subtitle: { ...typography.caption },
  logout: { ...typography.bodySmall, color: colors.secondaryDark },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statBox: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  statLabel: { ...typography.caption, marginTop: 4, textAlign: 'center' },
  section: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm },
  hint: { ...typography.caption, marginBottom: spacing.md },
  itemCard: { marginBottom: spacing.sm },
  itemTitle: { ...typography.h3, fontSize: 15, color: colors.primaryDark },
  itemMeta: { ...typography.caption, marginTop: 4 },
  tapHint: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
  cardTitle: { ...typography.bodySmall, fontWeight: '700', marginBottom: spacing.xs },
  cardBody: { ...typography.bodySmall, lineHeight: 20 },
  alertCard: { backgroundColor: '#FFF8E7', marginBottom: spacing.md },
  alertTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.secondaryDark },
  alertBody: { ...typography.bodySmall, marginTop: spacing.xs },
  link: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
  emptyCard: { marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, fontSize: 16, marginBottom: spacing.sm },
  emptyBody: { ...typography.bodySmall, lineHeight: 20 },
  exportRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  exportBtn: { flex: 1 },
});
