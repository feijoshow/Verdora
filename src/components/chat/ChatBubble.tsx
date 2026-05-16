import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ChatMessage } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && <Text style={styles.avatar}>🌱</Text>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.text, isUser && styles.textUser]}>{message.content}</Text>
        <Text style={[styles.time, isUser && styles.timeUser]}>
          {new Date(message.timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.md, alignItems: 'flex-end' },
  rowUser: { justifyContent: 'flex-end' },
  avatar: { fontSize: 24, marginRight: spacing.sm, marginBottom: spacing.xs },
  bubble: {
    maxWidth: '80%',
    padding: spacing.md,
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
  text: { ...typography.bodySmall, lineHeight: 22, color: colors.text },
  textUser: { color: colors.white },
  time: { ...typography.caption, marginTop: spacing.xs, alignSelf: 'flex-end' },
  timeUser: { color: 'rgba(255,255,255,0.7)' },
});
