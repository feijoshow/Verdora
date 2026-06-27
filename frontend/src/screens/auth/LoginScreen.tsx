import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Input, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

const LOGO = require('../../../assets/verdora-logo.png');

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (route.params?.resetSuccess) {
      setSuccess('Password updated. Sign in with your new password.');
      navigation.setParams({ resetSuccess: undefined });
    }
  }, [navigation, route.params?.resetSuccess]);

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Login failed');
  };

  return (
    <ScreenWrapper keyboardAvoiding centerContent>
      <View style={styles.header}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Verdora logo" />
        <Text style={styles.brand}>Verdora</Text>
        <Text style={styles.subtitle}>Smart farming at your fingertips</Text>
      </View>

      <Card variant="elevated" style={styles.formCard}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
        {success ? <Text style={styles.success}>{success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth />
      </Card>

      <Button
        title="Create Account"
        variant="ghost"
        onPress={() => navigation.navigate('Register')}
        fullWidth
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: spacing.lg },
  logo: { width: 88, height: 88, marginBottom: spacing.sm },
  brand: { fontSize: 28, fontWeight: '700', color: colors.primaryDark, letterSpacing: -0.5 },
  subtitle: { ...typography.bodySmall, marginTop: spacing.xs, textAlign: 'center' },
  formCard: { marginBottom: spacing.md, width: '100%', maxWidth: 440, alignSelf: 'center' },
  forgotWrap: { alignSelf: 'flex-end', marginTop: -spacing.sm, marginBottom: spacing.md },
  forgotText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  success: { ...typography.bodySmall, color: colors.success, marginBottom: spacing.md },
  error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
});
