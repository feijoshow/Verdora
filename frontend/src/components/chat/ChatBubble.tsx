import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMessage } from '../../types';
import { MarkdownText } from '../ui/MarkdownText';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { colors, typography } = useTheme();
  const isUser = message.role === 'user';
  const isError = message.id.startsWith('err_');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
        rowUser: { justifyContent: 'flex-end' },
        avatar: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: colors.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.sm,
          marginBottom: spacing.xs,
        },
        avatarError: { backgroundColor: colors.errorSurface },
        bubble: {
          maxWidth: '82%',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          borderRadius: borderRadius.lg,
        },
        bubbleUser: {
          backgroundColor: colors.primary,
          borderBottomRightRadius: spacing.xs,
        },
        bubbleAssistant: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderBottomLeftRadius: spacing.xs,
        },
        bubbleError: {
          backgroundColor: colors.errorSurface,
          borderWidth: 1,
          borderColor: colors.error,
          borderBottomLeftRadius: spacing.xs,
        },
        text: { ...typography.bodySmall, lineHeight: 22, color: colors.text },
        textUser: { color: colors.white },
        textError: { color: colors.error },
        time: { ...typography.caption, marginTop: spacing.xs, alignSelf: 'flex-end', color: colors.textMuted },
        timeUser: { color: 'rgba(255,255,255,0.75)' },
        timeError: { color: colors.textMuted },
      }),
    [colors, typography],
  );

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={[styles.avatar, isError && styles.avatarError]}>
          <Ionicons
            name={isError ? 'alert-circle' : 'leaf'}
            size={16}
            color={isError ? colors.error : colors.primary}
          />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : isError ? styles.bubbleError : styles.bubbleAssistant,
        ]}
      >
        <MarkdownText
          style={[styles.text, isUser && styles.textUser, isError && styles.textError]}
          boldStyle={[styles.text, isUser && styles.textUser, isError && styles.textError]}
        >
          {message.content}
        </MarkdownText>
        <Text style={[styles.time, isUser && styles.timeUser, isError && styles.timeError]}>
          {new Date(message.timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}
