import React, { useMemo } from 'react';
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
  centerContent?: boolean;
}

export function ScreenWrapper({
  children,
  scrollable = true,
  padded = true,
  refreshControl,
  keyboardAvoiding = false,
  centerContent = false,
  style,
  ...rest
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const tabBar = useTabBarOptional();
  const scrollBottomPadding = useScrollBottomPadding();
  const bottomPad = scrollBottomPadding + spacing.lg;

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
      style={styles.flex}
      contentContainerStyle={contentStyle}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      nestedScrollEnabled
      onScroll={tabBar?.onContentScroll}
      scrollEventThrottle={16}
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
