import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, borderRadius } from '../constants/theme';

export type FeedbackKind = 'info' | 'warning' | 'error';

interface FeedbackContextValue {
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (message: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 5000;

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const [kind, setKind] = useState<FeedbackKind>('info');
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setMessage(null);
    });
  }, [opacity]);

  const show = useCallback(
    (text: string, nextKind: FeedbackKind) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(text);
      setKind(nextKind);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timerRef.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    },
    [dismiss, opacity],
  );

  const value = useMemo(
    () => ({
      showInfo: (text: string) => show(text, 'info'),
      showWarning: (text: string) => show(text, 'warning'),
      showError: (text: string) => show(text, 'error'),
    }),
    [show],
  );

  const bannerStyle =
    kind === 'error'
      ? styles.bannerError
      : kind === 'warning'
        ? styles.bannerWarning
        : styles.bannerInfo;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {message ? (
        <Animated.View
          style={[styles.bannerWrap, { top: insets.top + spacing.xs, opacity }]}
          pointerEvents="box-none"
        >
          <Pressable style={[styles.banner, bannerStyle]} onPress={dismiss}>
            <Text style={styles.bannerText}>{message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used within FeedbackProvider');
  return ctx;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 9999,
  },
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: colors.black,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerInfo: { backgroundColor: colors.primaryDark },
  bannerWarning: { backgroundColor: colors.warning },
  bannerError: { backgroundColor: colors.error },
  bannerText: { ...typography.bodySmall, color: colors.white, fontWeight: '600' },
});
