import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { LocationPicker } from '../../components/location/LocationPicker';
import { Button, CollapsibleSection, Input, ScreenWrapper } from '../../components/ui';
import { PrivacySettingsCard } from '../../components/privacy/PrivacySettingsCard';
import { FieldsManager } from '../../components/fields/FieldsManager';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { buildFeedbackMailtoUrl } from '../../constants/support';
import { useAuth } from '../../context/AuthContext';
import type { VerdoraLocation } from '../../data/namibiaLocations';
import type { FarmerType, User } from '../../types';
import { applyVerdoraLocation, isValidVerdoraLocation, verdoraLocationFromUser } from '../../utils/locationHelpers';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const FARMER_TYPES: { value: FarmerType; label: string }[] = [
  { value: 'small-scale', label: 'Small-scale' },
  { value: 'commercial', label: 'Commercial' },
];

export function ProfileScreen() {
  const { user, updateProfile, logout } = useAuth();
  const [name, setName] = useState('');
  const [location, setLocation] = useState<VerdoraLocation | null>(null);
  const [locationError, setLocationError] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [farmerType, setFarmerType] = useState<FarmerType>('small-scale');
  const [soilType, setSoilType] = useState('');
  const [methods, setMethods] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setLocation(verdoraLocationFromUser(user));
    setFarmSize(user.farmSize ?? '');
    setFarmerType(user.farmerType ?? 'small-scale');
    setSoilType(user.soilType ?? '');
    setMethods(user.farmingMethods?.join(', ') ?? '');
  }, [user]);

  if (!user || user.role !== 'farmer') return null;

  const handleFeedback = async () => {
    const url = buildFeedbackMailtoUrl({
      userEmail: user.email,
      userName: user.name,
    });
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Email not available', 'Set up an email app on this device to send feedback.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open email', 'Try again or contact support from another device.');
    }
  };

  const handleSave = async () => {
    setLocationError('');
    if (!isValidVerdoraLocation(location)) {
      setLocationError('Please select your region and town/village');
      Alert.alert('Location required', 'Please select your region and town/village.');
      return;
    }
    setSaving(true);
    try {
      const locationFields = applyVerdoraLocation(location);
      await updateProfile({
        name: name.trim() || user.name,
        ...locationFields,
        farmSize: farmSize.trim() || undefined,
        farmerType,
        soilType: soilType.trim() || undefined,
        farmingMethods: methods
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
      } as Partial<User>);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const locationSubtitle = user.location ?? 'Set region & town for weather and advice';

  return (
    <ScreenWrapper keyboardAvoiding>
      <ScreenHeader banner title="Profile" />

      <CollapsibleSection title="Personal" defaultOpen>
        <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
        <Input label="Email" value={user.email} editable={false} placeholder={user.email} />
      </CollapsibleSection>

      <CollapsibleSection title="Location" subtitle={locationSubtitle} defaultOpen>
        <LocationPicker
          label="Region & town/village"
          value={location}
          onChange={(next) => {
            setLocation(next);
            setLocationError('');
          }}
          error={locationError}
        />
      </CollapsibleSection>

      <CollapsibleSection title="My fields" subtitle="Used for scans and weather" defaultOpen>
        <FieldsManager userId={user.id} embedded />
      </CollapsibleSection>

      <CollapsibleSection title="Farm details" subtitle={farmSize || farmerType}>
        <Input label="Farm size" value={farmSize} onChangeText={setFarmSize} placeholder="e.g. 2 hectares" />
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
        <Input label="Soil type" value={soilType} onChangeText={setSoilType} placeholder="Loamy, clay, sandy…" />
        <Input
          label="Farming methods"
          value={methods}
          onChangeText={setMethods}
          placeholder="Organic, irrigation, rotation…"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Privacy & data">
        <PrivacySettingsCard embedded />
      </CollapsibleSection>

      <CollapsibleSection title="Feedback">
        <Text style={styles.hint}>Report bugs or share suggestions with the team.</Text>
        <Button title="Send feedback" variant="outline" onPress={handleFeedback} fullWidth />
      </CollapsibleSection>

      <Button title="Save profile" onPress={handleSave} loading={saving} fullWidth />
      <Button title="Log out" variant="ghost" onPress={logout} fullWidth style={styles.logout} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  hint: { ...typography.caption, marginBottom: spacing.md, lineHeight: 18 },
  fieldLabel: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.sm },
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
  logout: { marginTop: spacing.md, marginBottom: spacing.lg },
});
