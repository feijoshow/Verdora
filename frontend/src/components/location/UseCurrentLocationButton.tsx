import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getCurrentCoordinates,
  LocationPermissionError,
  LocationUnavailableError,
  openAppSettings,
  type DeviceCoordinates,
} from '../../services/location/deviceLocationService';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface UseCurrentLocationButtonProps {
  label?: string;
  onLocation: (coords: DeviceCoordinates) => void | Promise<void>;
  disabled?: boolean;
}

export function UseCurrentLocationButton({
  label = 'Use current location',
  onLocation,
  disabled = false,
}: UseCurrentLocationButtonProps) {
  const { colors, typography } = useTheme();
  const [loading, setLoading] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        button: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primaryLight,
          backgroundColor: colors.primarySoft,
          marginBottom: spacing.md,
        },
        buttonDisabled: { opacity: 0.6 },
        label: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
      }),
    [colors, typography],
  );

  const handlePress = async () => {
    setLoading(true);
    try {
      const coords = await getCurrentCoordinates();
      await onLocation(coords);
    } catch (error) {
      if (error instanceof LocationPermissionError) {
        Alert.alert('Location permission needed', error.message, [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => openAppSettings().catch(() => undefined) },
        ]);
        return;
      }
      const message =
        error instanceof LocationUnavailableError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not read your location';
      Alert.alert('Location unavailable', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="locate-outline" size={18} color={colors.primary} />
      )}
      <Text style={styles.label}>{loading ? 'Getting location…' : label}</Text>
    </Pressable>
  );
}
