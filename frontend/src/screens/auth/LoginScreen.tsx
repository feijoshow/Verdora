import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Login failed');
  };

  return (
    <ScreenWrapper keyboardAvoiding centerContent>
      <View style={styles.header}>
        <Text style={styles.logo}>🌱 Verdora</Text>
        <Text style={styles.subtitle}>Smart farming at your fingertips</Text>
      </View>

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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Sign In" onPress={handleLogin} loading={loading} fullWidth />

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
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 36, fontWeight: '700', color: colors.primary },
  subtitle: { ...typography.bodySmall, marginTop: spacing.sm },
  error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
});
