import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, ScreenWrapper } from '../../components/ui';
import { PrivacySettingsCard } from '../../components/privacy/PrivacySettingsCard';
import { FieldsManager } from '../../components/fields/FieldsManager';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { useAuth } from '../../context/AuthContext';
import type { FarmerType, User } from '../../types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

const FARMER_TYPES: { value: FarmerType; label: string }[] = [
  { value: 'small-scale', label: 'Small-scale' },
  { value: 'commercial', label: 'Commercial' },
];

function parseLocationFields(user: User): { region: string; village: string } {
  if (user.region || user.village) {
    return { region: user.region ?? '', village: user.village ?? '' };
  }
  if (user.location?.includes(',')) {
    const parts = user.location.split(',').map((s) => s.trim());
    return { village: parts[0] ?? '', region: parts.slice(1).join(', ') };
  }
  return { region: user.location ?? '', village: '' };
}

function buildLocation(village: string, region: string): string {
  return [village.trim(), region.trim()].filter(Boolean).join(', ');
}

export function ProfileScreen() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [village, setVillage] = useState('');
  const [farmSize, setFarmSize] = useState('');
  const [farmerType, setFarmerType] = useState<FarmerType>('small-scale');
  const [soilType, setSoilType] = useState('');
  const [methods, setMethods] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loc = parseLocationFields(user);
    setName(user.name ?? '');
    setRegion(loc.region);
    setVillage(loc.village);
    setFarmSize(user.farmSize ?? '');
    setFarmerType(user.farmerType ?? 'small-scale');
    setSoilType(user.soilType ?? '');
    setMethods(user.farmingMethods?.join(', ') ?? '');
  }, [user]);

  if (!user || user.role !== 'farmer') return null;

  const handleSave = async () => {
    if (!region.trim() && !village.trim()) {
      Alert.alert('Location required', 'Please enter at least a region or village.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim() || user.name,
        region: region.trim() || undefined,
        village: village.trim() || undefined,
        location: buildLocation(village, region),
        farmSize: farmSize.trim() || undefined,
        farmerType,
        soilType: soilType.trim() || undefined,
        farmingMethods: methods
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean),
      });
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper keyboardAvoiding>
      <ScreenHeader
        title="My profile"
        subtitle="Personal details, farm info & privacy"
      />

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Personal</Text>
        <Input label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
        <Input
          label="Email"
          value={user.email}
          editable={false}
          placeholder={user.email}
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Location</Text>
        <Text style={styles.hint}>
          Used for weather forecasts, regional insights, and chat advice.
        </Text>
        <Input
          label="Region / province"
          value={region}
          onChangeText={setRegion}
          placeholder="e.g. Laguna, Philippines"
        />
        <Input
          label="Village / town"
          value={village}
          onChangeText={setVillage}
          placeholder="e.g. Calamba"
        />
      </Card>

      {user ? <FieldsManager userId={user.id} /> : null}

      <Card style={styles.card}>
        <Text style={styles.sectionLabel}>Farm details</Text>
        <Input
          label="Farm size"
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

        <Input
          label="Soil type"
          value={soilType}
          onChangeText={setSoilType}
          placeholder="e.g. Loamy, Clay, Sandy"
        />
        <Input
          label="Farming methods (comma-separated)"
          value={methods}
          onChangeText={setMethods}
          placeholder="Organic, Irrigation, Crop rotation"
        />
      </Card>

      <PrivacySettingsCard />

      <Button title="Save profile" onPress={handleSave} loading={saving} fullWidth />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  sectionLabel: { ...typography.h3, fontSize: 16, color: colors.primaryDark, marginBottom: spacing.sm },
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
});
