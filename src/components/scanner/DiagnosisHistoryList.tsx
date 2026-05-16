import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { DiagnosisResult } from '../../types';
import { Card } from '../ui/Card';
import { colors, spacing, typography } from '../../constants/theme';

interface DiagnosisHistoryListProps {
  items: DiagnosisResult[];
  onPressItem: (item: DiagnosisResult) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DiagnosisHistoryList({ items, onPressItem }: DiagnosisHistoryListProps) {
  if (items.length === 0) {
    return (
      <Card variant="highlight">
        <Text style={styles.empty}>No scans yet. Capture or upload a crop photo to begin.</Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {items.slice(0, 5).map((item) => (
        <Pressable key={item.id} onPress={() => onPressItem(item)}>
          <Card style={styles.item}>
            <View style={styles.row}>
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbEmoji}>🌿</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.crop}>{item.cropName}</Text>
                <Text style={styles.disease}>
                  {item.disease ?? 'Healthy — no disease detected'}
                </Text>
                <Text style={styles.meta}>
                  {Math.round(item.confidence * 100)}% · {formatDate(item.scannedAt)}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  item: { padding: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 56, height: 56, borderRadius: 10 },
  thumbPlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 24 },
  info: { flex: 1, marginLeft: spacing.md },
  crop: { ...typography.h3, fontSize: 16, color: colors.primaryDark },
  disease: { ...typography.bodySmall, marginTop: 2 },
  meta: { ...typography.caption, marginTop: 4 },
  chevron: { fontSize: 22, color: colors.textMuted, marginLeft: spacing.sm },
  empty: { ...typography.bodySmall, textAlign: 'center' },
});
