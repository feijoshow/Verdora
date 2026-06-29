import React, { useCallback, useMemo, useRef } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Button, Card, EmptyState, MarkdownText, ScreenWrapper } from '../../components/ui';
import { ConfidenceBar } from '../../components/scanner/ConfidenceBar';
import { ScanFollowUpPanel } from '../../components/scanner/ScanFollowUpPanel';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import type { FarmerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FarmerStackParamList, 'DiagnosisResults'>;

export function DiagnosisResultsScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const result = route.params?.result;

  const scrollToFollowUp = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        image: {
          width: '100%',
          height: 220,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.md,
        },
        imagePlaceholder: {
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        },
        placeholderEmoji: { fontSize: 64 },
        resultCard: { marginBottom: spacing.lg },
        badgeRow: { marginBottom: spacing.md },
        badge: {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
          borderRadius: borderRadius.full,
        },
        badgeHealthy: { backgroundColor: colors.surfaceAlt },
        badgeDisease: { backgroundColor: colors.errorSurface },
        badgeText: { ...typography.caption, fontWeight: '700', color: colors.text },
        label: {
          ...typography.caption,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
          color: colors.textMuted,
        },
        cropName: { ...typography.h1, fontSize: 26, color: colors.text },
        fieldName: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
        disease: { ...typography.body, fontWeight: '600', color: colors.error },
        healthyText: { color: colors.success },
        treatment: { ...typography.bodySmall, lineHeight: 22, color: colors.text },
        scanNote: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          backgroundColor: colors.primarySoft,
          padding: spacing.sm,
          borderRadius: borderRadius.md,
          marginBottom: spacing.sm,
        },
        timestamp: { ...typography.caption, marginTop: spacing.lg, color: colors.textMuted },
      }),
    [colors, typography],
  );

  if (!result) {
    return (
      <ScreenWrapper centerContent scrollable={false}>
        <ScreenHeader title="Diagnosis Results" showBack />
        <EmptyState
          message="No scan results to show. Try scanning again."
          variant="muted"
        />
        <Button title="Back to scanner" onPress={() => navigation.goBack()} fullWidth />
      </ScreenWrapper>
    );
  }

  const isHealthy = !result.disease;

  return (
    <ScreenWrapper keyboardAvoiding keyboardVerticalOffset={56} scrollRef={scrollRef}>
      <ScreenHeader title="Diagnosis Results" showBack />

      {result.imageUri ? (
        <Image source={{ uri: result.imageUri }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderEmoji}>🌱</Text>
        </View>
      )}

      <Card variant="elevated" style={styles.resultCard}>
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isHealthy ? styles.badgeHealthy : styles.badgeDisease]}>
            <Text style={styles.badgeText}>{isHealthy ? 'Healthy' : 'Disease detected'}</Text>
          </View>
        </View>

        <Text style={styles.label}>Crop</Text>
        <Text style={styles.cropName}>{result.cropName}</Text>

        {result.fieldName ? (
          <>
            <Text style={styles.label}>Field</Text>
            <Text style={styles.fieldName}>{result.fieldName}</Text>
          </>
        ) : null}

        {result.scanPrompt ? (
          <>
            <Text style={styles.label}>Your scan note</Text>
            <Text style={styles.scanNote}>“{result.scanPrompt}”</Text>
          </>
        ) : null}

        <Text style={styles.label}>Condition</Text>
        <MarkdownText
          style={[styles.disease, isHealthy && styles.healthyText]}
          boldStyle={[styles.disease, isHealthy && styles.healthyText]}
        >
          {result.disease ?? 'No disease detected'}
        </MarkdownText>

        <ConfidenceBar confidence={result.confidence} />

        <Text style={styles.label}>Suggested treatment</Text>
        <MarkdownText style={styles.treatment}>{result.treatment}</MarkdownText>

        <Text style={styles.timestamp}>
          Scanned {new Date(result.scannedAt).toLocaleString()}
        </Text>
      </Card>

      <ScanFollowUpPanel result={result} onInputFocus={scrollToFollowUp} />

      <Button title="Scan another crop" onPress={() => navigation.goBack()} fullWidth />
    </ScreenWrapper>
  );
}
