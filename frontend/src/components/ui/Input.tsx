import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing, touchTarget } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, secureTextEntry, ...rest }: InputProps) {
  const { colors, typography } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: { ...typography.bodySmall, marginBottom: spacing.xs, fontWeight: '500', color: colors.text },
        inputRow: { position: 'relative', justifyContent: 'center' },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 4,
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.inputBackground,
        },
        inputWithToggle: { paddingRight: spacing.xl + touchTarget },
        inputError: { borderColor: colors.error },
        toggle: {
          position: 'absolute',
          right: spacing.sm,
          height: touchTarget,
          width: touchTarget,
          alignItems: 'center',
          justifyContent: 'center',
        },
        error: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            isPassword && styles.inputWithToggle,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={isPassword && !passwordVisible}
          {...rest}
        />
        {isPassword ? (
          <Pressable
            style={styles.toggle}
            onPress={() => setPasswordVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
