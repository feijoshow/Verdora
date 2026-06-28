import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui';
import { MAP_ZOOM_DELTA, NAMIBIA_MAP_CENTER } from '../../constants/map';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import {
  getCurrentCoordinates,
  LocationPermissionError,
  LocationUnavailableError,
  openAppSettings,
  type DeviceCoordinates,
} from '../../services/location/deviceLocationService';
import type { MapLocationPickerProps } from './mapLocationPickerTypes';

function toRegion(coords: DeviceCoordinates): Region {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    ...MAP_ZOOM_DELTA,
  };
}

export function MapLocationPicker({
  value,
  onChange,
  label = 'Farm location on map',
  buttonLabel = 'Pick on map',
}: MapLocationPickerProps) {
  const { colors, typography } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<DeviceCoordinates | null>(value ?? null);
  const [locating, setLocating] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: { ...typography.bodySmall, fontWeight: '600', marginBottom: spacing.xs, color: colors.text },
        hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm, lineHeight: 18 },
        selectedRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          marginBottom: spacing.sm,
        },
        selectedText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
        openButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primaryLight,
          backgroundColor: colors.primarySoft,
        },
        openButtonText: { ...typography.bodySmall, color: colors.text, fontWeight: '600' },
        modal: { flex: 1, backgroundColor: colors.background },
        modalHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        modalTitle: { ...typography.h3, fontSize: 18, color: colors.text, flex: 1 },
        modalHint: {
          ...typography.caption,
          color: colors.textMuted,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.sm,
          lineHeight: 18,
        },
        mapWrap: {
          flex: 1,
          marginHorizontal: spacing.md,
          borderRadius: borderRadius.lg,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        map: { flex: 1 },
        mapOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.08)',
        },
        mapOverlayText: {
          ...typography.bodySmall,
          color: colors.white,
          backgroundColor: colors.overlay,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          overflow: 'hidden',
        },
        gpsButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          marginHorizontal: spacing.md,
          marginTop: spacing.md,
          paddingVertical: spacing.sm,
        },
        gpsButtonText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
        modalActions: {
          flexDirection: 'row',
          gap: spacing.sm,
          padding: spacing.md,
        },
        actionBtn: { flex: 1 },
      }),
    [colors, typography],
  );

  useEffect(() => {
    if (visible) {
      setDraft(value ?? null);
    }
  }, [visible, value]);

  const openPicker = () => setVisible(true);
  const closePicker = () => setVisible(false);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setDraft({ latitude, longitude });
  }, []);

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCurrentCoordinates();
      setDraft(coords);
      mapRef.current?.animateToRegion(toRegion(coords), 400);
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
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    if (!draft) return;
    onChange(draft);
    setVisible(false);
  };

  const initialRegion = toRegion(value ?? NAMIBIA_MAP_CENTER);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.selectedRow}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <Text style={styles.selectedText}>Location pinned on map</Text>
        </View>
      ) : (
        <Text style={styles.hint}>Tap the map to mark where your farm or field is.</Text>
      )}
      <Pressable style={styles.openButton} onPress={openPicker} accessibilityRole="button">
        <Ionicons name="map-outline" size={20} color={colors.primary} />
        <Text style={styles.openButtonText}>{value ? 'Change map pin' : buttonLabel}</Text>
      </Pressable>

      <Modal visible={visible} animationType="slide" onRequestClose={closePicker}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tap your farm on the map</Text>
            <Pressable onPress={closePicker} hitSlop={12} accessibilityLabel="Close map">
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.modalHint}>
            Move the map and tap the spot. You can also jump to where you are now.
          </Text>

          <View style={styles.mapWrap}>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={initialRegion}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton={false}
            >
              {draft ? (
                <Marker
                  coordinate={draft}
                  title="Your farm"
                  description="Drag or tap elsewhere to move"
                  draggable
                  onDragEnd={(e) => setDraft(e.nativeEvent.coordinate)}
                />
              ) : null}
            </MapView>
            {!draft ? (
              <View style={styles.mapOverlay} pointerEvents="none">
                <Text style={styles.mapOverlayText}>Tap the map to drop a pin</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            style={styles.gpsButton}
            onPress={handleUseCurrentLocation}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="locate-outline" size={18} color={colors.primary} />
            )}
            <Text style={styles.gpsButtonText}>
              {locating ? 'Getting location…' : 'Use my current location'}
            </Text>
          </Pressable>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={closePicker} style={styles.actionBtn} />
            <Button
              title="Confirm location"
              onPress={handleConfirm}
              disabled={!draft}
              style={styles.actionBtn}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
