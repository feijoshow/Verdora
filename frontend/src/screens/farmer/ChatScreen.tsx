import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatHistoryModal } from '../../components/chat/ChatHistoryModal';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { ScreenLoader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { trackChatQuestion, removeChatQuestion } from '../../services/analytics/dataCollectionService';
import {
  deleteChatExchange,
  extractChatExchanges,
  loadChatHistory,
  saveChatHistory,
  sendChatMessage,
  type ChatExchange,
} from '../../services/api/chatService';
import { buildQuickPrompts } from '../../services/ai/chatPrompts';
import { getFarmerSummary } from '../../services/data/farmerDataService';
import { toApiError } from '../../services/api/errors';
import type { ChatMessage } from '../../types';
import { useTabBarOptional } from '../../context/TabBarContext';
import { useTheme } from '../../context/ThemeContext';
import { tabBarSafeBottomInset } from '../../navigation/tabBarConstants';
import { spacing, borderRadius } from '../../constants/theme';
import { confirmDestructive } from '../../utils/confirmAction';

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
  const { colors, typography, shadows } = useTheme();
  const { showWarning } = useFeedback();
  const insets = useSafeAreaInsets();
  const tabBar = useTabBarOptional();
  /** Fixed — tab bar floats over the transparent gap when visible */
  const inputBottomPad = tabBarSafeBottomInset(insets.bottom) + spacing.sm;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const stickToBottomRef = useRef(true);
  const footerBottomPad = keyboardVisible ? spacing.xs : inputBottomPad;
  const [footerHeight, setFooterHeight] = useState(160);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        body: { flex: 1 },
        chatBody: { flex: 1 },
        headerWrap: {
          paddingHorizontal: spacing.md,
        },
        list: { flex: 1 },
        listContent: { padding: spacing.md, flexGrow: 1 },
        typing: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: spacing.xs,
          gap: spacing.xs,
        },
        typingText: { ...typography.caption, color: colors.textMuted, fontSize: 12 },
        promptsWrap: {
          paddingBottom: spacing.xs,
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
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.primaryLight,
          backgroundColor: colors.primarySoft,
        },
        promptText: { ...typography.caption, color: colors.text, fontWeight: '600' },
        composerPanel: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          backgroundColor: colors.background,
        },
        inputShell: {
          flexDirection: 'row',
          alignItems: 'flex-end',
          backgroundColor: colors.surface,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.border,
          paddingLeft: spacing.md,
          paddingRight: spacing.xs,
          paddingVertical: spacing.xs,
          minHeight: 46,
          ...shadows.card,
        },
        input: {
          flex: 1,
          maxHeight: 96,
          paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
          fontSize: 16,
          lineHeight: 22,
          color: colors.text,
        },
        sendBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 1,
        },
        sendDisabled: { opacity: 0.35 },
        inputFooter: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        },
        disclaimer: {
          ...typography.caption,
          fontSize: 12,
          lineHeight: 17,
          color: colors.textMuted,
          textAlign: 'center',
          marginTop: spacing.sm,
          paddingHorizontal: spacing.sm,
        },
      }),
    [colors, typography, shadows],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const summary = await getFarmerSummary(user);
      const stored = await loadChatHistory(user.id);
      const crops = summary.crops;
      setPrompts(buildQuickPrompts(user, summary));
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

  const onListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      tabBar?.onContentScroll(event);

      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      stickToBottomRef.current = distanceFromBottom < 96;
    },
    [tabBar],
  );

  const onListContentSizeChange = useCallback(() => {
    if (stickToBottomRef.current) {
      scrollToEnd();
    }
  }, [scrollToEnd]);

  const hasUserMessages = messages.some((m) => m.role === 'user');
  const showPrompts = !hasUserMessages && prompts.length > 0;
  const exchanges = useMemo(() => extractChatExchanges(messages), [messages]);

  const scrollToMessage = useCallback((userMessageId: string) => {
    const index = messages.findIndex((m) => m.id === userMessageId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    }
  }, [messages]);

  const handleDeleteExchange = useCallback(
    async (exchange: ChatExchange) => {
      if (!user) return;

      const ok = await confirmDestructive(
        'Delete question?',
        'This removes the question and Verdora\'s reply from your chat history.',
        'Delete',
      );
      if (!ok) return;

      const updated = await deleteChatExchange(user.id, exchange, messages);
      await removeChatQuestion(user.id, exchange.logId, exchange.question);
      if (updated.some((m) => m.role === 'user')) {
        setMessages(updated);
      } else {
        const summary = await getFarmerSummary(user);
        const welcome = [welcomeMessage(summary.crops)];
        setMessages(welcome);
        await saveChatHistory(user.id, welcome);
      }
    },
    [messages, user],
  );

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
    stickToBottomRef.current = true;
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
        showWarning(notice);
      }

      const logId = await trackChatQuestion(user, trimmed, reply.content);
      const taggedUser = logId ? { ...userMessage, logId } : userMessage;
      const taggedReply = logId ? { ...reply, logId } : reply;
      const withReply = [...nextMessages.slice(0, -1), taggedUser, taggedReply];
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
      <ScreenLoader
        header={<ScreenHeader banner title="Chat" />}
        label="Loading your chat…"
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.headerWrap}>
          <ScreenHeader
            banner
            title="Chat"
            rightAction={{
              label: 'History',
              onPress: () => setHistoryOpen(true),
            }}
          />
        </View>

        <View style={styles.chatBody}>
          <FlatList
            ref={listRef}
            style={styles.list}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                onDelete={
                  item.role === 'user' && item.id !== 'welcome'
                    ? () => {
                        const exchange = exchanges.find((e) => e.userMessageId === item.id);
                        if (exchange) void handleDeleteExchange(exchange);
                      }
                    : undefined
                }
              />
            )}
            contentContainerStyle={[styles.listContent, { paddingBottom: footerHeight }]}
            onContentSizeChange={onListContentSizeChange}
            onScroll={onListScroll}
            scrollEventThrottle={32}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true }), 100);
            }}
          />

          <View
            style={[styles.inputFooter, { paddingBottom: footerBottomPad }]}
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
          >
            {showPrompts ? (
              <View style={styles.promptsWrap}>
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

            <View style={styles.composerPanel}>
              {sending ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.typingText}>Thinking…</Text>
                </View>
              ) : null}

              <View style={styles.inputShell}>
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
                  <Ionicons name="arrow-up" size={18} color={colors.onPrimary} />
                </Pressable>
              </View>

              {!keyboardVisible ? (
                <Text style={styles.disclaimer}>
                  AI guidance only — confirm important decisions with a qualified agronomist.
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <ChatHistoryModal
        visible={historyOpen}
        exchanges={exchanges}
        onClose={() => setHistoryOpen(false)}
        onSelect={(exchange) => {
          setHistoryOpen(false);
          scrollToMessage(exchange.userMessageId);
        }}
        onDelete={(exchange) => void handleDeleteExchange(exchange)}
      />
    </SafeAreaView>
  );
}
