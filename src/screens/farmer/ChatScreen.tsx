import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { sendChatMessage } from '../../services/api/chatService';
import { toApiError } from '../../services/api/errors';
import type { ChatMessage } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hello! I'm Verdora, your farming assistant. Ask me about crops, pests, diseases, planting times, or weather advice.",
  timestamp: new Date().toISOString(),
};

const SUGGESTED_PROMPTS = [
  'When should I plant rice?',
  'How to treat tomato blight?',
  'Best fertilizer for corn?',
];

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);
    scrollToEnd();

    try {
      const history = [...messages, userMessage]
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }));

      const { reply } = await sendChatMessage({
        message: trimmed,
        history: history.slice(-10),
      });

      setMessages((prev) => [...prev, reply]);
      scrollToEnd();
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I couldn't respond. ${toApiError(err).message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Farming Assistant</Text>
        <Text style={styles.subtitle}>Powered by Verdora AI</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToEnd}
        showsVerticalScrollIndicator={false}
      />

      {sending && (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.typingText}>Verdora is thinking…</Text>
        </View>
      )}

      <View style={styles.prompts}>
        {SUGGESTED_PROMPTS.map((prompt) => (
          <Pressable
            key={prompt}
            style={styles.promptChip}
            onPress={() => sendMessage(prompt)}
            disabled={sending}
          >
            <Text style={styles.promptText}>{prompt}</Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a farming question…"
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
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.h2, color: colors.primary },
  subtitle: { ...typography.caption },
  list: { padding: spacing.md, paddingBottom: spacing.sm },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  typingText: { ...typography.caption },
  prompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  promptChip: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptText: { ...typography.caption, color: colors.primary },
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
  sendIcon: { color: colors.white, fontSize: 18, fontWeight: '700' },
});
