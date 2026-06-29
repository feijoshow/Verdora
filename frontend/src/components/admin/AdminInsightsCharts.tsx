import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui/Card';
import { SimpleBarChart, type BarChartItem } from './charts/SimpleBarChart';
import type { AdminDashboardInsights } from '../../types/analytics';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

interface AdminInsightsChartsProps {
  data: AdminDashboardInsights;
}

export function AdminInsightsCharts({ data }: AdminInsightsChartsProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.md },
        sectionTitle: {
          ...typography.h3,
          fontSize: 16,
          marginBottom: spacing.md,
          color: colors.text,
        },
      }),
    [colors, typography],
  );

  const diseaseItems: BarChartItem[] = data.diseaseOutbreaks.slice(0, 6).map((o, i) => ({
    label: o.disease,
    value: o.count,
    color: [colors.error, colors.warning, colors.primary, colors.secondary][i % 4],
  }));

  const chatItems: BarChartItem[] = data.chatInsights.slice(0, 6).map((c) => ({
    label: c.topic,
    value: c.questionCount,
    color: colors.actionChat,
  }));

  const farmerTypeItems: BarChartItem[] = Object.entries(data.segments.byFarmerType).map(
    ([type, count]) => ({
      label: type,
      value: count,
      color: colors.primary,
    }),
  );

  const activityItems: BarChartItem[] = [
    { label: 'Scans', value: data.summary.totalScans, color: colors.actionScan },
    { label: 'Calendar', value: data.summary.totalFarmingRecords, color: colors.actionPlant },
    { label: 'Chat', value: data.summary.totalChatQuestions, color: colors.actionChat },
    { label: 'Weather', value: data.summary.totalEnvironmentLogs, color: colors.actionWeather },
  ];

  const gapItems: BarChartItem[] = data.regionalIntelligence.knowledgeGaps
    .slice(0, 5)
    .map((g) => ({
      key: g.id,
      label: g.topic,
      value: g.questionCount,
      color: colors.secondaryDark,
    }));

  return (
    <Card variant="elevated" style={styles.card}>
      <Text style={styles.sectionTitle}>Insights at a glance</Text>
      <SimpleBarChart title="Platform activity" items={activityItems} />
      <SimpleBarChart title="Disease detections" items={diseaseItems} />
      <SimpleBarChart title="Chat topics (farmer questions)" items={chatItems} />
      <SimpleBarChart title="Knowledge gaps (regional)" items={gapItems} />
      <SimpleBarChart title="Farmers by type" items={farmerTypeItems} />
    </Card>
  );
}
