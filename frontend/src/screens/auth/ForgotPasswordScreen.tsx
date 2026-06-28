import React, { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Input, ScreenWrapper } from '../../components/ui';
import { requestPasswordResetCode } from '../../services/api/authService';
import { toApiError } from '../../services/api/errors';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { ...typography.h1, color: colors.text, textAlign: 'center' },
        subtitle: { ...typography.bodySmall, marginTop: spacing.sm, marginBottom: spacing.lg, textAlign: 'center', color: colors.textSecondary },
        formCard: { width: '100%', maxWidth: 440, alignSelf: 'center', marginBottom: spacing.md },
        error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
      }),
    [colors, typography],
  );

  const handleSendCode = async () => {
    setError('');
    if (!email.trim()) {
      setError('Enter the email for your account');
      return;
    }

    setLoading(true);
    try {
      await requestPasswordResetCode(email);
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper keyboardAvoiding centerContent scrollable={false}>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.subtitle}>
        Enter your account email and we'll send you a 6-digit code to reset your password.
      </Text>

      <Card variant="elevated" style={styles.formCard}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Send reset code" onPress={handleSendCode} loading={loading} fullWidth />
      </Card>

      <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
    </ScreenWrapper>
  );
}
