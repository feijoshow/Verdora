import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export interface DeviceCoordinates {
  latitude: number;
  longitude: number;
}

export class LocationPermissionError extends Error {
  constructor(message = 'Location permission was denied') {
    super(message);
    this.name = 'LocationPermissionError';
  }
}

export class LocationUnavailableError extends Error {
  constructor(message = 'Could not determine your current location') {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED;
}

export async function getCurrentCoordinates(): Promise<DeviceCoordinates> {
  const granted = await requestLocationPermission();
  if (!granted) {
    throw new LocationPermissionError(
      'Allow location access in Settings to use GPS for weather and your farm profile.',
    );
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationUnavailableError('Turn on location services on your device and try again.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

export function formatCoordinates({ latitude, longitude }: DeviceCoordinates): string {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

export async function openAppSettings(): Promise<void> {
  if (Platform.OS === 'ios') {
    await Linking.openURL('app-settings:');
    return;
  }
  await Linking.openSettings();
}
