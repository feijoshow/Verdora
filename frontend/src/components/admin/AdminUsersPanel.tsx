import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, CollapsibleSection, EmptyState, Input } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import type { LocationSegment, UserProfileRecord } from '../../types/analytics';
import { filterUsersBySearch, groupUsersByRegion } from '../../utils/adminUserGrouping';
import { spacing } from '../../constants/theme';

interface AdminUsersPanelProps {
  farmers: UserProfileRecord[];
  regionSegments: LocationSegment[];
  onOpenUser: (userId: string) => void;
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  const { colors, typography } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        statBox: {
          width: '47%',
          backgroundColor: colors.surface,
          borderRadius: 8,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
        },
        statValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
        statLabel: {
          ...typography.caption,
          marginTop: 4,
          textAlign: 'center',
          color: colors.textMuted,
        },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatFarmerTypes(types: Record<string, number>): string {
  return Object.entries(types)
    .map(([type, count]) => `${type}: ${count}`)
    .join(' · ');
}

export function AdminUsersPanel({ farmers, regionSegments, onOpenUser }: AdminUsersPanelProps) {
  const { colors, typography } = useTheme();
  const [search, setSearch] = useState('');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm, color: colors.text },
        hint: { ...typography.caption, marginBottom: spacing.md, color: colors.textMuted },
        statGrid: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        searchWrap: { marginBottom: spacing.md },
        regionTable: { gap: spacing.sm },
        regionRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        regionColMain: { flex: 1.2 },
        regionColCount: { width: 56, alignItems: 'center' },
        regionColMeta: { flex: 1.4 },
        regionTitle: { ...typography.bodySmall, fontWeight: '700', color: colors.text },
        regionMeta: { ...typography.caption, marginTop: 2, color: colors.textMuted },
        userRow: {
          paddingVertical: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        userRowLast: { borderBottomWidth: 0 },
        itemTitle: { ...typography.h3, fontSize: 15, color: colors.text },
        itemMeta: { ...typography.caption, marginTop: 4, color: colors.textMuted },
        tapHint: { ...typography.caption, marginTop: spacing.sm, color: colors.primary, fontWeight: '600' },
        resultCount: { ...typography.caption, marginBottom: spacing.sm, color: colors.textSecondary },
      }),
    [colors, typography],
  );

  const filteredFarmers = useMemo(
    () => filterUsersBySearch(farmers, search),
    [farmers, search],
  );
  const groupedRegions = useMemo(
    () => groupUsersByRegion(filteredFarmers),
    [filteredFarmers],
  );

  const byFarmerType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const farmer of filteredFarmers) {
      const key = farmer.farmerType ?? 'unspecified';
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [filteredFarmers]);

  const visibleRegionSegments = useMemo(() => {
    if (!search.trim()) return regionSegments;
    const keys = new Set(groupedRegions.map((group) => group.regionKey));
    return regionSegments.filter((seg) => keys.has(seg.regionKey ?? seg.location.toLowerCase()));
  }, [groupedRegions, regionSegments, search]);

  return (
    <>
      <Text style={styles.section}>Search farmers</Text>
      <View style={styles.searchWrap}>
        <Input
          placeholder="Search by name, email, region, town, or crop…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <Text style={styles.section}>Segmentation by farmer type</Text>
      <View style={styles.statGrid}>
        {Object.entries(byFarmerType).map(([type, count]) => (
          <StatBox key={type} label={type} value={count} />
        ))}
      </View>

      <Text style={styles.section}>By region</Text>
      <Text style={styles.hint}>Same regions are merged — towns listed under each region.</Text>
      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.regionTable}>
          {visibleRegionSegments.map((seg) => (
            <View key={seg.regionKey ?? seg.location} style={styles.regionRow}>
              <View style={styles.regionColMain}>
                <Text style={styles.regionTitle}>📍 {seg.location}</Text>
              </View>
              <View style={styles.regionColCount}>
                <Text style={styles.regionTitle}>{seg.userCount}</Text>
              </View>
              <View style={styles.regionColMeta}>
                <Text style={styles.regionMeta}>{formatFarmerTypes(seg.farmerTypes)}</Text>
                {seg.towns?.length ? (
                  <Text style={styles.regionMeta} numberOfLines={2}>
                    Towns: {seg.towns.join(', ')}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <Text style={styles.section}>
        Farmers by region ({filteredFarmers.length}
        {search.trim() ? ` of ${farmers.length}` : ''})
      </Text>
      {search.trim() ? (
        <Text style={styles.resultCount}>Showing results for “{search.trim()}”</Text>
      ) : (
        <Text style={styles.hint}>Expand a region to browse farmers. Tap a profile for full activity.</Text>
      )}

      {filteredFarmers.length === 0 ? (
        <EmptyState
          message={search.trim() ? 'No farmers match your search.' : 'No farmers registered yet.'}
          variant="muted"
        />
      ) : (
        groupedRegions.map((group, index) => (
          <CollapsibleSection
            key={group.regionKey}
            title={`📍 ${group.regionLabel}`}
            subtitle={`${group.users.length} farmer${group.users.length === 1 ? '' : 's'} · ${formatFarmerTypes(group.farmerTypes)}${
              group.towns.length
                ? ` · ${group.towns.slice(0, 3).join(', ')}${group.towns.length > 3 ? '…' : ''}`
                : ''
            }`}
            defaultOpen={Boolean(search.trim()) || index === 0}
          >
            {group.users.map((user, userIndex) => (
              <Pressable
                key={user.id}
                onPress={() => onOpenUser(user.id)}
                style={[styles.userRow, userIndex === group.users.length - 1 && styles.userRowLast]}
              >
                <Text style={styles.itemTitle}>{user.name || 'Unnamed'}</Text>
                <Text style={styles.itemMeta}>{user.email}</Text>
                <Text style={styles.itemMeta}>
                  {user.townName ?? user.village ?? user.location ?? 'Location not set'}
                </Text>
                <Text style={styles.itemMeta}>
                  {user.farmerType ?? '—'} · {user.farmSize ?? 'Farm size N/A'}
                </Text>
                <Text style={styles.itemMeta}>Crops: {user.cropsPlanted?.join(', ') || 'None'}</Text>
                <Text style={styles.itemMeta}>
                  Status: {user.isActive === false ? '⛔ Deactivated' : '✓ Active'}
                </Text>
                <Text style={styles.tapHint}>View scans, chat, calendar & weather →</Text>
              </Pressable>
            ))}
          </CollapsibleSection>
        ))
      )}
    </>
  );
}
