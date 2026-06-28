import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Input } from '../ui';
import { FieldPicker } from '../fields/FieldPicker';
import {
  buildPlantingSummary,
  findPlantingGuide,
  formatCropDisplayName,
  getQuickAccessGuides,
  lookupLocalPlantingGuide,
  searchPlantingGuides,
} from '../../services/calendar/plantingGuideService';
import {
  generatePlantingGuide,
  loadCustomPlantingGuides,
  refreshCustomGuideIfStale,
  saveCustomPlantingGuide,
} from '../../services/calendar/customPlantingGuideService';
import type { CropPlantingGuide } from '../../data/cropPlantingGuide';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import { toApiError } from '../../services/api/errors';

export interface PlannerSavePayload {
  cropName: string;
  plantDate: string;
  harvestDate: string;
  fieldId: string | null;
  fieldName: string;
  notes: string;
}

interface CropPlantingPlannerProps {
  userId: string;
  userLocation?: string;
  onSave: (payload: PlannerSavePayload) => void;
  saving?: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CropPlantingPlanner({
  userId,
  userLocation,
  onSave,
  saving = false,
}: CropPlantingPlannerProps) {
  const { colors, typography } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<CropPlantingGuide | null>(null);
  const [customGuides, setCustomGuides] = useState<CropPlantingGuide[]>([]);
  const [plantDate, setPlantDate] = useState(todayIso());
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const guides = await loadCustomPlantingGuides(userId);
      if (!active) return;

      const refreshed = await Promise.all(
        guides.map(async (guide) => {
          const updated = await refreshCustomGuideIfStale(userId, guide.name, userLocation);
          return updated ?? guide;
        }),
      );

      if (active) setCustomGuides(refreshed);
    })();

    return () => {
      active = false;
    };
  }, [userId, userLocation]);

  const suggestions = useMemo(
    () => searchPlantingGuides(query, customGuides).slice(0, 6),
    [query, customGuides],
  );

  const quickAccessCrops = useMemo(() => getQuickAccessGuides(customGuides), [customGuides]);

  const activeGuide = selectedGuide ?? findPlantingGuide(query, customGuides);
  const summary = activeGuide ? buildPlantingSummary(activeGuide, plantDate) : null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.lg },
        cropRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
        cropChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
        cropChipActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
        cropChipText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
        cropChipTextActive: { color: colors.primary, fontWeight: '700' },
        suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
        suggestionChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.primarySoft,
          borderRadius: borderRadius.full,
          borderWidth: 1,
          borderColor: colors.border,
        },
        suggestionText: { ...typography.caption, color: colors.text, fontWeight: '600' },
        hint: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm, color: colors.textMuted },
        guideBox: { marginTop: spacing.sm },
        summaryCard: {
          backgroundColor: colors.primarySoft,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.sm,
        },
        summaryTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: spacing.sm,
        },
        guideHeading: { ...typography.h3, fontSize: 18, color: colors.text, flex: 1 },
        summaryLine: { ...typography.bodySmall, lineHeight: 20, marginTop: 2, color: colors.text },
        badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
        badgeGood: { backgroundColor: colors.surfaceAlt },
        badgeWait: { backgroundColor: colors.warningSurface },
        badgeText: { ...typography.caption, fontWeight: '700', color: colors.text },
        detailsToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingVertical: spacing.sm,
          marginBottom: spacing.sm,
        },
        detailsToggleText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
        detailsBox: {
          backgroundColor: colors.background,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
        },
        guideRow: { marginBottom: spacing.sm },
        guideLabel: { ...typography.caption, fontWeight: '700', color: colors.textMuted },
        guideValue: { ...typography.bodySmall, lineHeight: 20, marginTop: 2, color: colors.text },
        dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
        dateInput: { flex: 1 },
        todayBtn: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.primary,
          marginBottom: spacing.xs,
          backgroundColor: colors.surface,
        },
        todayBtnText: { ...typography.caption, color: colors.primary, fontWeight: '700' },
        harvestBanner: {
          backgroundColor: colors.surfaceAlt,
          padding: spacing.md,
          borderRadius: borderRadius.md,
          marginBottom: spacing.md,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
        },
        harvestLabel: { ...typography.caption, fontWeight: '700', color: colors.textSecondary },
        harvestValue: { ...typography.h3, color: colors.text, marginTop: 4 },
        noGuide: { marginTop: spacing.md, gap: spacing.sm },
        noGuideText: { ...typography.bodySmall, lineHeight: 20, textAlign: 'center', color: colors.text },
      }),
    [colors, typography],
  );

  const selectCrop = (guide: CropPlantingGuide) => {
    setSelectedGuide(guide);
    setQuery(guide.name);
    setDetailsOpen(false);
  };

  const persistCustomGuide = useCallback(
    async (guide: CropPlantingGuide) => {
      const saved = await saveCustomPlantingGuide(userId, guide);
      setCustomGuides(saved);
      return guide;
    },
    [userId],
  );

  const handleGenerateGuide = async () => {
    const cropName = query.trim();
    if (!cropName) {
      Alert.alert('Enter a crop', 'Type the crop you want a guide for.');
      return;
    }

    setGenerating(true);
    try {
      const guide = await generatePlantingGuide(cropName, userLocation);
      await persistCustomGuide(guide);
      setSelectedGuide(guide);
      setQuery(guide.name);
    } catch (err) {
      Alert.alert('Could not generate guide', toApiError(err).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const cropName = formatCropDisplayName(activeGuide?.name ?? query);
    if (!cropName) {
      Alert.alert('Choose a crop', 'Select or type a crop name.');
      return;
    }
    if (!plantDate.trim()) {
      Alert.alert('Plant date required', 'Enter when you plan to plant.');
      return;
    }

    let guide = activeGuide ?? lookupLocalPlantingGuide(cropName);
    if (!guide) {
      setGenerating(true);
      try {
        guide = await generatePlantingGuide(cropName, userLocation);
        await persistCustomGuide(guide);
        setSelectedGuide(guide);
        setQuery(guide.name);
      } catch (err) {
        Alert.alert('Could not create guide', toApiError(err).message);
        setGenerating(false);
        return;
      }
      setGenerating(false);
    }

    const harvestDate = buildPlantingSummary(guide, plantDate).harvestDate ?? '';
    const notes = `Soil: ${guide.soilType} (${guide.soilPh}). Irrigation: ${guide.irrigation}.`;

    onSave({
      cropName: guide.name,
      plantDate: plantDate.trim(),
      harvestDate,
      fieldId,
      fieldName,
      notes,
    });
  };

  return (
    <Card variant="elevated" style={styles.card}>
      <Input
        label="Crop name"
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setSelectedGuide(null);
          setDetailsOpen(false);
        }}
        placeholder="Tomato, Mahangu, Mango…"
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cropRow}
      >
        {quickAccessCrops.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.cropChip, activeGuide?.id === g.id && styles.cropChipActive]}
            onPress={() => selectCrop(g)}
          >
            <Text style={[styles.cropChipText, activeGuide?.id === g.id && styles.cropChipTextActive]}>
              {g.name.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {query && !activeGuide && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((g) => (
            <Pressable key={g.id} style={styles.suggestionChip} onPress={() => selectCrop(g)}>
              <Text style={styles.suggestionText}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {activeGuide && summary ? (
        <View style={styles.guideBox}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Text style={styles.guideHeading}>{activeGuide.name}</Text>
              <View style={[styles.badge, summary.inSeason ? styles.badgeGood : styles.badgeWait]}>
                <Text style={styles.badgeText}>
                  {summary.inSeason ? 'In season' : 'Off season'}
                </Text>
              </View>
            </View>
            <Text style={styles.summaryLine}>
              Plant: {activeGuide.bestPlantingMonths}
            </Text>
            <Text style={styles.summaryLine}>
              Maturity: {activeGuide.maturityDaysRange}
            </Text>
          </View>

          <Pressable style={styles.detailsToggle} onPress={() => setDetailsOpen((v) => !v)}>
            <Text style={styles.detailsToggleText}>
              {detailsOpen ? 'Hide' : 'Show'} soil & irrigation details
            </Text>
            <Ionicons
              name={detailsOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.primary}
            />
          </Pressable>

          {detailsOpen ? (
            <View style={styles.detailsBox}>
              <GuideRow label="Soil" value={`${activeGuide.soilType} · ${activeGuide.soilPh}`} />
              <GuideRow label="Irrigation" value={activeGuide.irrigation} />
              <GuideRow label="Water" value={activeGuide.waterNote} />
            </View>
          ) : null}

          <View style={styles.dateRow}>
            <View style={styles.dateInput}>
              <Input
                label="Plant date"
                value={plantDate}
                onChangeText={setPlantDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
            <Pressable style={styles.todayBtn} onPress={() => setPlantDate(todayIso())}>
              <Text style={styles.todayBtnText}>Today</Text>
            </Pressable>
          </View>

          {summary.harvestDate ? (
            <View style={styles.harvestBanner}>
              <Text style={styles.harvestLabel}>Expected harvest</Text>
              <Text style={styles.harvestValue}>{summary.harvestLabel}</Text>
            </View>
          ) : null}

          <FieldPicker
            userId={userId}
            value={fieldId}
            onChange={(id, field) => {
              setFieldId(id);
              setFieldName(field?.name ?? '');
            }}
            label="Field (optional)"
          />

          <Button
            title="Add to calendar"
            onPress={handleSave}
            loading={saving || generating}
            fullWidth
          />
        </View>
      ) : query.trim() ? (
        <View style={styles.noGuide}>
          <Text style={styles.noGuideText}>
            No guide for “{query.trim()}” in our library yet.
          </Text>
          <Button
            title="Generate guide"
            onPress={handleGenerateGuide}
            loading={generating}
            fullWidth
          />
        </View>
      ) : (
        <Text style={styles.hint}>Pick a crop above or type a name to get started.</Text>
      )}
    </Card>
  );
}

function GuideRow({ label, value }: { label: string; value: string }) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        guideRow: { marginBottom: spacing.sm },
        guideLabel: { ...typography.caption, fontWeight: '700', color: colors.textMuted },
        guideValue: { ...typography.bodySmall, lineHeight: 20, marginTop: 2, color: colors.text },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.guideRow}>
      <Text style={styles.guideLabel}>{label}</Text>
      <Text style={styles.guideValue}>{value}</Text>
    </View>
  );
}
