import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card } from '../ui';
import type { KnowledgeGapReport } from '../../types/analytics';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

interface KnowledgeGapCardProps {
  report: KnowledgeGapReport;
}

/** NGO / extension knowledge gap report card */
export function KnowledgeGapCard({ report }: KnowledgeGapCardProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.sm },
        title: { ...typography.h3, fontSize: 15, color: colors.text },
        region: { ...typography.caption, marginTop: 4, fontWeight: '600', color: colors.textSecondary },
        count: { ...typography.caption, marginTop: spacing.xs, color: colors.textMuted },
        sample: { ...typography.bodySmall, marginTop: spacing.sm, fontStyle: 'italic', lineHeight: 20, color: colors.text },
        hint: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
      }),
    [colors, typography],
  );

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
