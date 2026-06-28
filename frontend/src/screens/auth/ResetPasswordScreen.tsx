import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Input, ScreenWrapper } from '../../components/ui';
import {
  completePasswordReset,
  requestPasswordResetCode,
} from '../../services/api/authService';
import { toApiError } from '../../services/api/errors';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { colors, typography } = useTheme();
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { ...typography.h1, color: colors.text, textAlign: 'center' },
        subtitle: { ...typography.bodySmall, marginTop: spacing.sm, marginBottom: spacing.lg, textAlign: 'center', color: colors.textSecondary },
        email: { fontWeight: '600', color: colors.text },
        formCard: { width: '100%', maxWidth: 440, alignSelf: 'center', marginBottom: spacing.md },
        error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
        info: { ...typography.bodySmall, color: colors.success, marginBottom: spacing.md },
        resendWrap: { alignSelf: 'center', marginBottom: spacing.sm, padding: spacing.sm },
        resendText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
      }),
    [colors, typography],
  );

  const handleReset = async () => {
    setError('');
    setInfo('');
    if (!code.trim()) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(email, code, password);
      navigation.navigate('Login', { resetSuccess: true });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await requestPasswordResetCode(email);
      setInfo('A new code was sent to your email.');
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenWrapper keyboardAvoiding centerContent scrollable={false}>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code sent to{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      <Card variant="elevated" style={styles.formCard}>
        <Input
          label="Reset code"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder="123456"
        />
        <Input
          label="New password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        <Input
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <Button title="Update password" onPress={handleReset} loading={loading} fullWidth />
      </Card>

      <Pressable onPress={handleResend} disabled={resending} style={styles.resendWrap}>
        <Text style={styles.resendText}>{resending ? 'Sending…' : 'Resend code'}</Text>
      </Pressable>

      <Button title="Back to Login" variant="ghost" onPress={() => navigation.navigate('Login')} fullWidth />
    </ScreenWrapper>
  );
}
