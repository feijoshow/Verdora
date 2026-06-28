import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LocationPicker } from '../../components/location/LocationPicker';
import { MapLocationPicker } from '../../components/location/MapLocationPicker';
import { ConsentNotice } from '../../components/privacy/ConsentNotice';
import { Button, Input, ScreenWrapper } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import type { VerdoraLocation } from '../../data/namibiaLocations';
import type { FarmerType } from '../../types';
import { isValidVerdoraLocation } from '../../utils/locationHelpers';
import { spacing, borderRadius } from '../../constants/theme';
import type { AuthStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const FARMER_TYPES: { value: FarmerType; label: string }[] = [
  { value: 'small-scale', label: 'Small-scale' },
  { value: 'commercial', label: 'Commercial' },
];

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const { colors, typography } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<VerdoraLocation | null>(null);
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [locationError, setLocationError] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [farmerType, setFarmerType] = useState<FarmerType>('small-scale');
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { ...typography.h1, color: colors.primary, marginTop: spacing.lg },
        subtitle: { ...typography.bodySmall, marginBottom: spacing.lg, color: colors.textSecondary },
        fieldLabel: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.sm, color: colors.text },
        typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
        typeChip: {
          flex: 1,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          backgroundColor: colors.surface,
        },
        typeChipActive: { borderColor: colors.primary, backgroundColor: colors.surfaceAlt },
        typeText: { ...typography.bodySmall, color: colors.textSecondary },
        typeTextActive: { color: colors.primary, fontWeight: '700' },
        error: { ...typography.bodySmall, color: colors.error, marginBottom: spacing.md },
      }),
    [colors, typography],
  );

  const handleRegister = async () => {
    setError('');
    setLocationError('');
    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (!isValidVerdoraLocation(location)) {
      setLocationError('Please select your region and town/village');
      setError('Location is required');
      return;
    }
    if (!dataConsent) {
      setError('Please accept data collection to continue');
      return;
    }
    setLoading(true);
    const result = await register({
      name: name || undefined,
      email,
      password,
      location,
      latitude,
      longitude,
      farmSize: farmSize.trim() || undefined,
      farmerType,
      dataConsent: true,
    });
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Registration failed');
  };

  return (
    <ScreenWrapper keyboardAvoiding>
      <Text style={styles.title}>Join Verdora</Text>
      <Text style={styles.subtitle}>Agricultural intelligence for your farm</Text>

      <Input label="Full name (optional)" value={name} onChangeText={setName} placeholder="Maria Shikongo" />
      <Input
        label="Email *"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input label="Password *" value={password} onChangeText={setPassword} secureTextEntry />

      <LocationPicker
        label="Location *"
        value={location}
        onChange={(next) => {
          setLocation(next);
          setLocationError('');
        }}
        error={locationError}
      />
      <MapLocationPicker
        label="Pin your farm on the map (optional)"
        value={
          latitude != null && longitude != null ? { latitude, longitude } : null
        }
        onChange={(coords) => {
          setLatitude(coords.latitude);
          setLongitude(coords.longitude);
        }}
      />

      <Input
        label="Farm size (optional)"
        value={farmSize}
        onChangeText={setFarmSize}
        placeholder="e.g. 2 hectares"
      />

      <Text style={styles.fieldLabel}>Type of farmer</Text>
      <View style={styles.typeRow}>
        {FARMER_TYPES.map((t) => (
          <Pressable
            key={t.value}
            style={[styles.typeChip, farmerType === t.value && styles.typeChipActive]}
            onPress={() => setFarmerType(t.value)}
          >
            <Text style={[styles.typeText, farmerType === t.value && styles.typeTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ConsentNotice checked={dataConsent} onToggle={() => setDataConsent((v) => !v)} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Register" onPress={handleRegister} loading={loading} fullWidth />
      <Button title="Back to Login" variant="ghost" onPress={() => navigation.goBack()} fullWidth />
    </ScreenWrapper>
  );
}
