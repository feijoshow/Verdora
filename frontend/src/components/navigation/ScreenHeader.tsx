import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: { label: string; onPress: () => void };
  banner?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack,
  rightAction,
  banner = false,
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const { colors, typography } = useTheme();
  const showNavRow = Boolean(showBack && navigation.canGoBack()) || Boolean(rightAction);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing.lg, marginTop: spacing.xs },
        banner: {
          backgroundColor: colors.primaryDark,
          marginHorizontal: -spacing.md,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.md,
          marginBottom: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        },
        row: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        backBtn: {
          minWidth: 72,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
        },
        backPlaceholder: { minWidth: 72 },
        backText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
        rightAction: { ...typography.bodySmall, color: colors.secondaryDark, fontWeight: '600' },
        rightActionLight: { ...typography.bodySmall, color: colors.bannerTextMuted, fontWeight: '600' },
        title: { ...typography.h2, color: colors.text, letterSpacing: -0.3 },
        subtitle: {
          ...typography.bodySmall,
          marginTop: spacing.xs,
          lineHeight: 20,
          color: colors.textSecondary,
        },
        bannerTitle: {
          fontSize: 20,
          fontWeight: '700',
          color: colors.bannerText,
          letterSpacing: -0.3,
        },
        bannerSubtitle: {
          ...typography.bodySmall,
          color: colors.bannerTextMuted,
          marginTop: 4,
        },
      }),
    [colors, typography],
  );

  if (banner) {
    return (
      <View style={styles.banner}>
        {showNavRow ? (
          <View style={styles.row}>
            {showBack && navigation.canGoBack() ? (
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
                <Ionicons name="chevron-back" size={22} color={colors.bannerText} />
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            {rightAction ? (
              <Pressable onPress={rightAction.onPress} hitSlop={8}>
                <Text style={styles.rightActionLight}>{rightAction.label}</Text>
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
          </View>
        ) : null}
        <Text style={styles.bannerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.bannerSubtitle}>{subtitle}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {showNavRow ? (
        <View style={styles.row}>
          {showBack && navigation.canGoBack() ? (
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          {rightAction ? (
            <Pressable onPress={rightAction.onPress} hitSlop={8}>
              <Text style={styles.rightAction}>{rightAction.label}</Text>
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}
