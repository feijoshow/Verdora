import type { LocationSegment, UserProfileRecord } from '../types/analytics';
import type { User } from '../types';

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseLocationParts(location?: string): { town?: string; region?: string } {
  const parts = (location ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { town: parts.slice(0, -1).join(', '), region: parts[parts.length - 1] };
  }
  if (parts.length === 1) return { region: parts[0] };
  return {};
}

/** Stable key for grouping users in the same region. */
export function normalizeRegionKey(user: User): string {
  if (user.regionId?.trim()) return user.regionId.trim().toLowerCase();
  if (user.regionName?.trim()) return user.regionName.trim().toLowerCase();
  if (user.region?.trim()) return user.region.trim().toLowerCase();

  const parsed = parseLocationParts(user.location ?? user.locationLegacy);
  if (parsed.region) return parsed.region.toLowerCase();
  return 'unknown';
}

/** Human-readable region label for admin tables. */
export function getRegionDisplayLabel(user: User): string {
  if (user.regionName?.trim()) return titleCase(user.regionName.trim());
  if (user.region?.trim()) return titleCase(user.region.trim());

  const parsed = parseLocationParts(user.location ?? user.locationLegacy);
  if (parsed.region) return titleCase(parsed.region);
  if (user.location?.trim()) return user.location.trim();
  if (user.locationLegacy?.trim()) return user.locationLegacy.trim();
  return 'Unknown region';
}

export function getTownDisplayLabel(user: User): string | undefined {
  if (user.townName?.trim()) return user.townName.trim();
  if (user.village?.trim()) return user.village.trim();
  return parseLocationParts(user.location ?? user.locationLegacy).town;
}

export function aggregateLocationSegments(users: UserProfileRecord[]): LocationSegment[] {
  const map = new Map<string, LocationSegment>();

  for (const user of users) {
    const regionKey = normalizeRegionKey(user);
    const seg =
      map.get(regionKey) ??
      ({
        location: getRegionDisplayLabel(user),
        regionKey,
        userCount: 0,
        farmerTypes: {},
        towns: [],
      } satisfies LocationSegment);

    seg.userCount += 1;
    const ft = user.farmerType ?? 'unspecified';
    seg.farmerTypes[ft] = (seg.farmerTypes[ft] ?? 0) + 1;

    const town = getTownDisplayLabel(user);
    if (town && !seg.towns?.includes(town)) {
      seg.towns = [...(seg.towns ?? []), town];
    }

    map.set(regionKey, seg);
  }

  return Array.from(map.values()).sort((a, b) => b.userCount - a.userCount);
}

export interface RegionUserGroup {
  regionKey: string;
  regionLabel: string;
  users: UserProfileRecord[];
  farmerTypes: Record<string, number>;
  towns: string[];
}

export function groupUsersByRegion(users: UserProfileRecord[]): RegionUserGroup[] {
  const map = new Map<string, RegionUserGroup>();

  for (const user of users) {
    const regionKey = normalizeRegionKey(user);
    const group =
      map.get(regionKey) ??
      ({
        regionKey,
        regionLabel: getRegionDisplayLabel(user),
        users: [],
        farmerTypes: {},
        towns: [],
      } satisfies RegionUserGroup);

    group.users.push(user);
    const ft = user.farmerType ?? 'unspecified';
    group.farmerTypes[ft] = (group.farmerTypes[ft] ?? 0) + 1;

    const town = getTownDisplayLabel(user);
    if (town && !group.towns.includes(town)) group.towns.push(town);

    map.set(regionKey, group);
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      users: group.users.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)),
      towns: group.towns.sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => b.users.length - a.users.length);
}

export function filterUsersBySearch(users: UserProfileRecord[], query: string): UserProfileRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;

  return users.filter((user) => {
    const haystack = [
      user.name,
      user.email,
      user.location,
      user.locationLegacy,
      user.regionName,
      user.townName,
      user.village,
      user.farmerType,
      user.farmSize,
      user.soilType,
      ...(user.cropsPlanted ?? []),
      ...(user.farmingMethods ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(q);
  });
}
