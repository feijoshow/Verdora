import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PlantingEvent } from '../../types';
import { Card } from '../ui/Card';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface PlantingEventCardProps {
  event: PlantingEvent;
  onPress: () => void;
  onDelete: () => void;
  onLogCare?: (type: 'water' | 'fertilize' | 'weed' | 'inspect') => void;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PlantingEventCard({ event, onPress, onDelete, onLogCare }: PlantingEventCardProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.sm },
        content: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        },
        iconWrap: {
          width: 40,
          height: 40,
          borderRadius: borderRadius.full,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        },
        main: { flex: 1, minWidth: 0 },
        cropName: { ...typography.h3, fontSize: 16, color: colors.text },
        planted: { ...typography.caption, marginTop: 2, color: colors.textSecondary },
        field: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
        harvestPill: {
          alignItems: 'flex-end',
          paddingHorizontal: spacing.sm,
        },
        harvestLabel: { ...typography.caption, fontWeight: '700', color: colors.textMuted },
        harvestDate: { ...typography.bodySmall, color: colors.primary, fontWeight: '700', marginTop: 2 },
        deleteBtn: { padding: spacing.xs },
        careRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        careQuick: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: borderRadius.full,
          backgroundColor: colors.primarySoft,
          borderWidth: 1,
          borderColor: colors.border,
        },
        careQuickText: { ...typography.caption, fontWeight: '600', color: colors.text },
      }),
    [colors, typography],
  );

  return (
    <Card style={styles.card}>
      <Pressable onPress={onPress} style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="leaf" size={20} color={colors.primary} />
        </View>

        <View style={styles.main}>
          <Text style={styles.cropName}>{event.cropName}</Text>
          <Text style={styles.planted}>Planted {formatDate(event.plantDate)}</Text>
          {event.fieldName ? (
            <Text style={styles.field} numberOfLines={1}>
              {event.fieldName}
            </Text>
          ) : null}
        </View>

        {event.harvestDate ? (
          <View style={styles.harvestPill}>
            <Text style={styles.harvestLabel}>Harvest</Text>
            <Text style={styles.harvestDate}>{formatDate(event.harvestDate)}</Text>
          </View>
        ) : null}

        <Pressable onPress={onDelete} hitSlop={12} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>

      {onLogCare ? (
        <View style={styles.careRow}>
          <Pressable style={styles.careQuick} onPress={() => onLogCare('water')}>
            <Ionicons name="water" size={14} color={colors.primary} />
            <Text style={styles.careQuickText}>Water</Text>
          </Pressable>
          <Pressable style={styles.careQuick} onPress={() => onLogCare('fertilize')}>
            <Ionicons name="nutrition" size={14} color={colors.primary} />
            <Text style={styles.careQuickText}>Feed</Text>
          </Pressable>
          <Pressable style={styles.careQuick} onPress={() => onLogCare('inspect')}>
            <Ionicons name="search" size={14} color={colors.primary} />
            <Text style={styles.careQuickText}>Inspect</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
