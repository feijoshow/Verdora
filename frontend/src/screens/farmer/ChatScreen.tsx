import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { trackChatQuestion } from '../../services/analytics/dataCollectionService';
import {
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
} from '../../services/api/chatService';
import { getFarmerSummary } from '../../services/data/farmerDataService';
import { toApiError } from '../../services/api/errors';
import type { ChatMessage } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

function welcomeMessage(crops: string[]): ChatMessage {
  const cropHint =
    crops.length > 0
      ? ` I see you grow ${crops.join(', ')} — ask me anything about them.`
      : ' Add crops in Calendar so I can give specific advice.';
  return {
    id: 'welcome',
    role: 'assistant',
    content: `Hello! I'm Verdora.${cropHint}`,
    timestamp: new Date().toISOString(),
  };
}

export function ChatScreen() {
  const { user } = useAuth();
  const { showWarning, showInfo } = useFeedback();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const summary = await getFarmerSummary(user);
      const stored = await loadChatHistory(user.id);
      const crops = summary.crops;
      setPrompts(
        crops.length > 0
          ? [
              `When should I plant ${crops[0]}?`,
              `How is my ${crops[0]} doing?`,
              `Weather advice for ${crops[0]}`,
            ]
          : ['What crops should I start with?', 'How do I use the calendar?'],
      );
      setMessages(stored.length > 0 ? stored : [welcomeMessage(crops)]);
      setLoading(false);
    })();
  }, [user]);

  const persistMessages = useCallback(
    async (msgs: ChatMessage[]) => {
      if (user) await saveChatHistory(user.id, msgs);
    },
    [user],
  );

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const showPrompts = !hasUserMessages && prompts.length > 0;

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending || !user) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const history = nextMessages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply, notice } = await sendChatMessage(user, {
        message: trimmed,
        history: history.slice(-10),
      });

      if (notice) {
        if (notice.includes('internet') || notice.includes('busy') || notice.includes('Could not reach')) {
          showWarning(notice);
        } else {
          showInfo(notice);
        }
      }

      await trackChatQuestion(user, trimmed, reply.content);

      const withReply = [...nextMessages, reply];
      setMessages(withReply);
      await persistMessages(withReply);
      scrollToEnd();
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't respond. ${toApiError(err).message}`,
        timestamp: new Date().toISOString(),
      };
      const withErr = [...nextMessages, errorMsg];
      setMessages(withErr);
      await persistMessages(withErr);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.title}>Farming Assistant</Text>
          <Text style={styles.subtitle}>Answers based on your real farm data</Text>
        </View>

        <FlatList
          ref={listRef}
          style={styles.list}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {sending && (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>Thinking…</Text>
          </View>
        )}

        {showPrompts ? (
          <View style={styles.promptsWrap}>
            <Text style={styles.promptsLabel}>Quick questions</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prompts}
              keyboardShouldPersistTaps="handled"
            >
              {prompts.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={styles.promptChip}
                  onPress={() => sendMessage(prompt)}
                  disabled={sending}
                >
                  <Text style={styles.promptText}>{prompt}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
        >
          <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your crops…"
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
              editable={!sending}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || sending}
            >
              <Ionicons name="send" size={18} color={colors.white} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  loader: { flex: 1, marginTop: 100 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h2, color: colors.primary },
  subtitle: { ...typography.caption },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.sm, flexGrow: 1 },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  typingText: { ...typography.caption },
  promptsWrap: {
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  promptsLabel: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  prompts: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  promptChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  promptText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendDisabled: { opacity: 0.4 },
});
