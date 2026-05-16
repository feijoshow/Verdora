import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Input, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, typography } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Registration failed');
  };

  return (
    <ScreenWrapper padded>
      <Text style={styles.title}>Join Verdora</Text>
      <Text style={styles.subtitle}>Register as a farmer to get started</Text>

      <Input label="Full Name" value={name} onChangeText={setName} />
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input label="Password" value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Register" onPress={handleRegister} loading={loading} fullWidth />
      <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h1, color: colors.primary, marginTop: spacing.lg },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
});
