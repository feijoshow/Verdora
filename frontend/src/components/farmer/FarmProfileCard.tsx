import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';

/** Optional farm details — collected for admin analytics */
export function FarmProfileCard() {
  const { user, updateProfile } = useAuth();
  const { colors, typography } = useTheme();
  const [soilType, setSoilType] = useState(user?.soilType ?? '');
  const [methods, setMethods] = useState(user?.farmingMethods?.join(', ') ?? '');
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!user?.soilType);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg },
        title: { ...typography.h3, fontSize: 16, color: colors.text },
        subtitle: { ...typography.caption, marginBottom: spacing.md, color: colors.textSecondary },
        row: { flexDirection: 'row', gap: spacing.sm },
        btn: { flex: 1 },
        saved: { ...typography.bodySmall, marginBottom: spacing.sm, color: colors.text },
      }),
    [colors, typography],
  );

  if (!user || user.role !== 'farmer') return null;

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      soilType: soilType.trim() || undefined,
      farmingMethods: methods
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean),
    });
    setSaving(false);
    setExpanded(false);
  };

  return (
    <Card variant="highlight" style={styles.card}>
      <Text style={styles.title}>🌱 Farm profile (optional)</Text>
      <Text style={styles.subtitle}>
        Soil type & farming methods help Verdora improve regional insights
      </Text>

      {expanded ? (
        <>
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
          <View style={styles.row}>
            <Button title="Save" onPress={handleSave} loading={saving} style={styles.btn} />
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => setExpanded(false)}
              style={styles.btn}
            />
          </View>
        </>
      ) : (
        <View>
          <Text style={styles.saved}>
            Soil: {user.soilType ?? 'Not set'} · Methods:{' '}
            {user.farmingMethods?.join(', ') || 'Not set'}
          </Text>
          <Button title="Update farm details" variant="outline" onPress={() => setExpanded(true)} />
        </View>
      )}
    </Card>
  );
}
