/** Haversine distance between two WGS84 points in kilometres */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Known region centroids for demo / location-string fallback */
const REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  'laguna, philippines': { lat: 14.2691, lng: 121.4113 },
  'ashanti, ghana': { lat: 6.747, lng: -1.554 },
  'kumasi, ghana': { lat: 6.6885, lng: -1.6244 },
  'nairobi, kenya': { lat: -1.2921, lng: 36.8219 },
  'lagos, nigeria': { lat: 6.5244, lng: 3.3792 },
  'java, indonesia': { lat: -7.6145, lng: 110.2038 },
  'hq': { lat: 0, lng: 0 },
};

/** Extract a coarse region label from a free-text location */
export function extractRegion(location?: string | null): string {
  if (!location?.trim()) return 'Unknown';
  const parts = location.split(',').map((p) => p.trim());
  if (parts.length >= 2) return parts[parts.length - 1];
  return parts[0];
}

/** Resolve coordinates from explicit lat/lng or location string */
export function resolveCoordinates(
  location?: string | null,
  latitude?: number | null,
  longitude?: number | null,
): { lat: number; lng: number } | null {
  if (latitude != null && longitude != null) {
    return { lat: latitude, lng: longitude };
  }
  if (!location) return null;
  const key = location.trim().toLowerCase();
  const exact = REGION_COORDS[key];
  if (exact) return exact;
  for (const [label, coords] of Object.entries(REGION_COORDS)) {
    if (key.includes(label.split(',')[0]) || label.includes(key.split(',')[0])) {
      return coords;
    }
  }
  return null;
}

/** Simple centroid of a point set */
export function centroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } {
  if (points.length === 0) return { lat: 0, lng: 0 };
  const sum = points.reduce(
    (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
    { lat: 0, lng: 0 },
  );
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export const DEFAULT_ALERT_RADIUS_KM = 50;
export const MIN_SCANS_FOR_ALERT = 3;
export const ALERT_LOOKBACK_DAYS = 30;
