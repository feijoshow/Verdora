import React from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../constants/theme';

interface ScreenWrapperProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
}

/** Consistent safe-area layout for all screens */
export function ScreenWrapper({
  children,
  scrollable = true,
  padded = true,
  style,
  ...rest
}: ScreenWrapperProps) {
  const contentStyle = [styles.content, padded && styles.padded, style];

  if (scrollable) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[contentStyle, styles.scrollContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={contentStyle} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
  padded: { paddingHorizontal: spacing.md },
  scrollContent: { paddingBottom: spacing.xxl },
});
