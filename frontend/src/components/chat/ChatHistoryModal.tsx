import React, { useMemo } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatExchange } from '../../services/api/chatService';
import { EmptyState } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius, touchTarget } from '../../constants/theme';
import { formatLocalTime, parseIsoTimestamp } from '../../utils/dateTime';

interface ChatHistoryModalProps {
  visible: boolean;
  exchanges: ChatExchange[];
  onClose: () => void;
  onSelect: (exchange: ChatExchange) => void;
  onDelete: (exchange: ChatExchange) => void;
}

function formatAskedAt(iso: string): string {
  const date = parseIsoTimestamp(iso);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) return formatLocalTime(iso);

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function ChatHistoryModal({
  visible,
  exchanges,
  onClose,
  onSelect,
  onDelete,
}: ChatHistoryModalProps) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        overlay: { flex: 1, justifyContent: 'flex-end' },
        backdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.overlay,
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: borderRadius.xl,
          borderTopRightRadius: borderRadius.xl,
          maxHeight: '85%',
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        handle: {
          width: 40,
          height: 4,
          backgroundColor: colors.border,
          borderRadius: 2,
          alignSelf: 'center',
          marginTop: spacing.sm,
        },
        title: { ...typography.h3, color: colors.text },
        closeBtn: {
          width: touchTarget,
          height: touchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        },
        list: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
        item: {
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        itemTop: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: spacing.sm,
        },
        itemBody: { flex: 1 },
        question: { ...typography.bodySmall, fontWeight: '600', color: colors.text, lineHeight: 20 },
        answer: {
          ...typography.caption,
          color: colors.textSecondary,
          marginTop: spacing.xs,
          lineHeight: 18,
        },
        meta: {
          ...typography.caption,
          color: colors.textMuted,
          marginTop: spacing.xs,
        },
        deleteBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.errorSurface,
        },
        emptyWrap: { padding: spacing.md },
      }),
    [colors, typography, insets.bottom],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close history" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Past questions</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {exchanges.length === 0 ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                message="No questions yet. Ask Verdora anything about your crops."
                variant="muted"
              />
            </View>
          ) : (
            <FlatList
              data={exchanges}
              keyExtractor={(item) => item.userMessageId}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.item}>
                  <View style={styles.itemTop}>
                    <Pressable style={styles.itemBody} onPress={() => onSelect(item)}>
                      <Text style={styles.question} numberOfLines={2}>
                        {item.question}
                      </Text>
                      {item.answer ? (
                        <Text style={styles.answer} numberOfLines={2}>
                          {item.answer}
                        </Text>
                      ) : null}
                      <Text style={styles.meta}>{formatAskedAt(item.askedAt)}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.deleteBtn}
                      onPress={() => onDelete(item)}
                      hitSlop={8}
                      accessibilityLabel="Delete question"
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
