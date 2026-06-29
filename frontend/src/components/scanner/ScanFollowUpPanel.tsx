import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChatBubble } from '../chat/ChatBubble';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useTheme } from '../../context/ThemeContext';
import { trackChatQuestion } from '../../services/analytics/dataCollectionService';
import { sendChatMessage } from '../../services/api/chatService';
import { toApiError } from '../../services/api/errors';
import {
  buildScanFollowUpPrompts,
  diagnosisToScanChatContext,
} from '../../services/ai/scanPrompts';
import type { ChatMessage, DiagnosisResult } from '../../types';
import { spacing, borderRadius, touchTarget } from '../../constants/theme';

interface ScanFollowUpPanelProps {
  result: DiagnosisResult;
  onInputFocus?: () => void;
}

export function ScanFollowUpPanel({ result, onInputFocus }: ScanFollowUpPanelProps) {
  const { user } = useAuth();
  const { colors, typography } = useTheme();
  const { showWarning } = useFeedback();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const quickPrompts = useMemo(() => buildScanFollowUpPrompts(result), [result]);
  const scanContext = useMemo(() => diagnosisToScanChatContext(result), [result]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg },
        title: { ...typography.h3, fontSize: 16, color: colors.text, marginBottom: spacing.xs },
        subtitle: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
        scanNote: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          backgroundColor: colors.primarySoft,
          padding: spacing.sm,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
        },
        messages: { gap: spacing.sm, marginBottom: spacing.md },
        prompts: { flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.sm },
        promptChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.primaryLight,
          backgroundColor: colors.surface,
          maxWidth: 260,
        },
        promptText: { ...typography.caption, color: colors.text, fontWeight: '600' },
        inputRow: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: spacing.sm,
        },
        input: {
          flex: 1,
          maxHeight: 88,
          backgroundColor: colors.background,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 2,
          fontSize: 15,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
        },
        sendBtn: {
          width: touchTarget,
          height: touchTarget,
          borderRadius: touchTarget / 2,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        sendDisabled: { opacity: 0.4 },
        typing: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        },
        typingText: { ...typography.caption, color: colors.textMuted },
      }),
    [colors, typography],
  );

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending || !user) return;

      const userMessage: ChatMessage = {
        id: `scan_user_${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString(),
      };

      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInput('');
      setSending(true);

      try {
        const history = nextMessages.map((m) => ({ role: m.role, content: m.content }));
        const { reply, notice } = await sendChatMessage(user, {
          message: trimmed,
          history: history.slice(-8),
          scanContext,
        });

        if (notice) showWarning(notice);
        await trackChatQuestion(user, trimmed, reply.content);

        setMessages([...nextMessages, reply]);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: `scan_err_${Date.now()}`,
          role: 'assistant',
          content: `Sorry, I couldn't respond. ${toApiError(err).message}`,
          timestamp: new Date().toISOString(),
        };
        setMessages([...nextMessages, errorMsg]);
      } finally {
        setSending(false);
      }
    },
    [messages, scanContext, sending, showWarning, user],
  );

  return (
    <Card variant="elevated" style={styles.card}>
      <Text style={styles.title}>Ask about this scan</Text>
      <Text style={styles.subtitle}>
        Follow up on the crop, disease, or pests detected — the assistant knows your scan results.
      </Text>

      {result.scanPrompt ? (
        <Text style={styles.scanNote}>Your scan note: “{result.scanPrompt}”</Text>
      ) : null}

      {messages.length > 0 ? (
        <View style={styles.messages}>
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </View>
      ) : null}

      {sending ? (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>Thinking…</Text>
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.prompts}
        keyboardShouldPersistTaps="handled"
      >
        {quickPrompts.map((prompt) => (
          <Pressable
            key={prompt}
            style={styles.promptChip}
            onPress={() => ask(prompt)}
            disabled={sending}
          >
            <Text style={styles.promptText}>{prompt}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onFocus={() => {
            onInputFocus?.();
          }}
          placeholder="Ask about this crop or pest…"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={400}
          editable={!sending}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={() => ask(input)}
          disabled={!input.trim() || sending}
          accessibilityRole="button"
          accessibilityLabel="Send question"
        >
          <Ionicons name="send" size={18} color={colors.white} />
        </Pressable>
      </View>
    </Card>
  );
}
