import React, { useMemo, type RefObject } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type RefreshControlProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarOptional } from '../../context/TabBarContext';
import { useTheme } from '../../context/ThemeContext';
import { useScrollBottomPadding } from '../../hooks/useScrollBottomPadding';
import { spacing } from '../../constants/theme';

interface ScreenWrapperProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  keyboardAvoiding?: boolean;
  /** Extra offset below the safe-area top (e.g. header height). */
  keyboardVerticalOffset?: number;
  scrollRef?: RefObject<ScrollView | null>;
  centerContent?: boolean;
}

export function ScreenWrapper({
  children,
  scrollable = true,
  padded = true,
  refreshControl,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  scrollRef,
  centerContent = false,
  style,
  ...rest
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tabBar = useTabBarOptional();
  const scrollBottomPadding = useScrollBottomPadding();
  const bottomPad = scrollBottomPadding + spacing.lg;
  const resolvedKeyboardOffset = insets.top + keyboardVerticalOffset;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        flex: { flex: 1, backgroundColor: colors.background },
        padded: { paddingHorizontal: spacing.md },
        centerContent: { flexGrow: 1, justifyContent: 'center' },
      }),
    [colors.background],
  );

  const contentStyle = [
    padded && styles.padded,
    { paddingBottom: bottomPad },
    centerContent && styles.centerContent,
    style,
  ];

  const scrollBody = (
    <ScrollView
      ref={scrollRef}
      style={styles.flex}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={keyboardAvoiding}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      nestedScrollEnabled
      onScroll={tabBar?.onContentScroll}
      scrollEventThrottle={32}
    >
      {children}
    </ScrollView>
  );

  const staticBody = (
    <View style={[styles.flex, contentStyle]} {...rest}>
      {children}
    </View>
  );

  const body = scrollable ? scrollBody : staticBody;

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={resolvedKeyboardOffset}
    >
      {body}
    </KeyboardAvoidingView>
  ) : (
    body
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {wrapped}
    </SafeAreaView>
  );
}
