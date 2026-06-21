import type { VerdoraLocation } from '../data/namibiaLocations';
import { OTHER_TOWN_ID } from '../data/namibiaLocations';
import type { User } from '../types';

/** Display label used across Home, weather headers, analytics, etc. */
export function getUserLocationDisplay(user: User): string | undefined {
  if (user.townName?.trim() && user.regionName?.trim()) {
    return `${user.townName.trim()}, ${user.regionName.trim()}`;
  }
  if (user.location?.trim()) return user.location.trim();
  if (user.locationLegacy?.trim()) return user.locationLegacy.trim();
  return undefined;
}

/** OpenWeather geocoding query — town name alone geocodes more reliably than full free text. */
export function getWeatherGeocodeQuery(user: User): string | undefined {
  if (user.townName?.trim()) return user.townName.trim();
  const legacy = user.locationLegacy ?? user.location;
  return legacy?.split(',')[0]?.trim() || undefined;
}

/** Chat / AI system prompt location line — omit constituency. */
export function getChatLocationLabel(user: User): string {
  if (user.townName?.trim() && user.regionName?.trim()) {
    return `${user.townName.trim()}, ${user.regionName.trim()} region`;
  }
  return getUserLocationDisplay(user) ?? 'Namibia (location not set in Profile)';
}

export function hasStructuredLocation(user: User): boolean {
  return !!(user.regionId && user.townName?.trim());
}

export function verdoraLocationFromUser(user: User): VerdoraLocation | null {
  if (user.regionId && user.townName?.trim() && user.regionName) {
    return {
      regionId: user.regionId,
      regionName: user.regionName,
      townId: user.townId ?? OTHER_TOWN_ID,
      townName: user.townName.trim(),
      constituency: user.constituency,
      isCustomTown: user.isCustomTown ?? false,
    };
  }
  return null;
}

export function applyVerdoraLocation(loc: VerdoraLocation): Partial<User> {
  const display = `${loc.townName}, ${loc.regionName}`;
  return {
    regionId: loc.regionId,
    regionName: loc.regionName,
    townId: loc.townId,
    townName: loc.townName,
    constituency: loc.constituency,
    isCustomTown: loc.isCustomTown,
    location: display,
    region: loc.regionName,
    village: loc.townName,
  };
}

export function isValidVerdoraLocation(loc: VerdoraLocation | null | undefined): loc is VerdoraLocation {
  return !!(loc?.regionId && loc.regionName && loc.townName?.trim());
}
