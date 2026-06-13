import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card } from '../ui';
import type { KnowledgeGapReport } from '../../types/analytics';
import { colors, spacing, typography } from '../../constants/theme';

interface KnowledgeGapCardProps {
  report: KnowledgeGapReport;
}

/** NGO / extension knowledge gap report card */
export function KnowledgeGapCard({ report }: KnowledgeGapCardProps) {
  const priorityColor =
    report.priority === 'high'
      ? colors.error
      : report.priority === 'medium'
        ? colors.secondaryDark
        : colors.textMuted;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{report.topic}</Text>
      <Text style={styles.region}>📍 {report.region}</Text>
      <Text style={styles.count}>
        {report.questionCount} farmers asked ·{' '}
        <Text style={{ color: priorityColor, fontWeight: '700' }}>
          {report.priority} priority
        </Text>
      </Text>
      <Text style={styles.sample} numberOfLines={2}>
        “{report.sampleQuestion}”
      </Text>
      <Text style={styles.hint}>
        Extension action: deploy {report.topic.toLowerCase()} training in {report.region}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  title: { ...typography.h3, fontSize: 15, color: colors.primaryDark },
  region: { ...typography.caption, marginTop: 4, fontWeight: '600' },
  count: { ...typography.caption, marginTop: spacing.xs },
  sample: { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic', lineHeight: 20 },
  hint: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
});
