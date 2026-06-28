import type { DeviceCoordinates } from '../../services/location/deviceLocationService';

export interface MapLocationPickerProps {
  value?: DeviceCoordinates | null;
  onChange: (coords: DeviceCoordinates) => void;
  label?: string;
  buttonLabel?: string;
}
