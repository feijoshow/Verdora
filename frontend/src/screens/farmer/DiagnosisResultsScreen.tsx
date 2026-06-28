import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Button, Card, EmptyState, ScreenWrapper } from '../../components/ui';
import { ConfidenceBar } from '../../components/scanner/ConfidenceBar';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import type { FarmerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FarmerStackParamList, 'DiagnosisResults'>;

export function DiagnosisResultsScreen({ navigation, route }: Props) {
  const result = route.params?.result;

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
    <ScreenWrapper>
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

        <Text style={styles.label}>Condition</Text>
        <Text style={[styles.disease, isHealthy && styles.healthyText]}>
          {result.disease ?? 'No disease detected'}
        </Text>

        <ConfidenceBar confidence={result.confidence} />

        <Text style={styles.label}>Treatment</Text>
        <Text style={styles.treatment}>{result.treatment}</Text>

        <Text style={styles.timestamp}>
          Scanned {new Date(result.scannedAt).toLocaleString()}
        </Text>
      </Card>

      <Button title="Scan another crop" onPress={() => navigation.goBack()} fullWidth />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  badgeText: { ...typography.caption, fontWeight: '700', color: colors.primaryDark },
  label: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  cropName: { ...typography.h1, fontSize: 26, color: colors.primaryDark },
  fieldName: { ...typography.body, color: colors.primary, marginBottom: spacing.sm },
  disease: { ...typography.body, fontWeight: '600', color: colors.error },
  healthyText: { color: colors.success },
  treatment: { ...typography.bodySmall, lineHeight: 22 },
  timestamp: { ...typography.caption, marginTop: spacing.lg },
});
