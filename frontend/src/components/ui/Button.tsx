import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors, shadows } = useTheme();
  const isDisabled = disabled || loading;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 48,
        },
        fullWidth: { width: '100%' },
        primary: { backgroundColor: colors.primary, ...shadows.button },
        secondary: { backgroundColor: colors.secondary },
        outline: {
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        ghost: { backgroundColor: 'transparent' },
        pressed: { opacity: 0.85 },
        disabled: { opacity: 0.5 },
        text: { fontSize: 16, fontWeight: '600' },
        primaryText: { color: colors.onPrimary },
        secondaryText: { color: colors.onSecondary },
        outlineText: { color: colors.primary },
        ghostText: { color: colors.primary },
      }),
    [colors, shadows],
  );

  const spinnerColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.onPrimary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text` as keyof typeof styles]]}>{title}</Text>
      )}
    </Pressable>
  );
}
