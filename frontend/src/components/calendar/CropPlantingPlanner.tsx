import React, { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Card, Input } from '../ui';
import { FieldPicker } from '../fields/FieldPicker';
import { CROP_PLANTING_GUIDE } from '../../data/cropPlantingGuide';
import {
  buildPlantingSummary,
  findPlantingGuide,
  formatDisplayDate,
  searchPlantingGuides,
} from '../../services/calendar/plantingGuideService';
import type { CropPlantingGuide } from '../../data/cropPlantingGuide';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

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
  onSave: (payload: PlannerSavePayload) => void;
  saving?: boolean;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CropPlantingPlanner({ userId, onSave, saving = false }: CropPlantingPlannerProps) {
  const [query, setQuery] = useState('');
  const [selectedGuide, setSelectedGuide] = useState<CropPlantingGuide | null>(null);
  const [plantDate, setPlantDate] = useState(todayIso());
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState('');

  const suggestions = useMemo(() => searchPlantingGuides(query).slice(0, 8), [query]);

  const activeGuide = selectedGuide ?? findPlantingGuide(query);
  const summary = activeGuide ? buildPlantingSummary(activeGuide, plantDate) : null;

  const selectCrop = (guide: CropPlantingGuide) => {
    setSelectedGuide(guide);
    setQuery(guide.name);
  };

  const handleSave = () => {
    const cropName = (activeGuide?.name ?? query).trim();
    if (!cropName) {
      Alert.alert('Choose a crop', 'Select a crop from the list or type its name.');
      return;
    }
    if (!plantDate.trim()) {
      Alert.alert('Plant date required', 'Enter when you plan to plant (YYYY-MM-DD).');
      return;
    }

    const harvestDate = activeGuide
      ? buildPlantingSummary(activeGuide, plantDate).harvestDate ?? ''
      : '';

    const notes = activeGuide
      ? `Soil: ${activeGuide.soilType} (${activeGuide.soilPh}). Irrigation: ${activeGuide.irrigation}.`
      : '';

    onSave({
      cropName,
      plantDate: plantDate.trim(),
      harvestDate,
      fieldId,
      fieldName,
      notes,
    });
  };

  return (
    <Card variant="highlight" style={styles.card}>
      <Text style={styles.title}>What do you want to plant?</Text>
      <Text style={styles.subtitle}>
        Pick a crop — we’ll show the best season, soil, irrigation, and harvest time.
      </Text>

      <Input
        label="Crop"
        value={query}
        onChangeText={(t) => {
          setQuery(t);
          setSelectedGuide(null);
        }}
        placeholder="e.g. Tomato, Sweetcorn, Lettuce"
      />

      {query && !activeGuide && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((g) => (
            <Pressable key={g.id} style={styles.suggestionChip} onPress={() => selectCrop(g)}>
              <Text style={styles.suggestionText}>{g.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cropRow}
      >
        {CROP_PLANTING_GUIDE.slice(0, 10).map((g) => (
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

      {activeGuide && summary ? (
        <View style={styles.guideBox}>
          <View style={styles.seasonRow}>
            <Text style={styles.guideHeading}>{activeGuide.name}</Text>
            <View style={[styles.badge, summary.inSeason ? styles.badgeGood : styles.badgeWait]}>
              <Text style={styles.badgeText}>
                {summary.inSeason ? 'Good season now' : 'Check season'}
              </Text>
            </View>
          </View>

          <GuideRow label="Best time to plant" value={activeGuide.bestPlantingMonths} />
          <GuideRow label="Days to harvest" value={activeGuide.maturityDaysRange} />
          <GuideRow label="Best soil" value={`${activeGuide.soilType} · ${activeGuide.soilPh}`} />
          <GuideRow label="Irrigation" value={activeGuide.irrigation} />
          <GuideRow label="Water needs" value={activeGuide.waterNote} />

          <Input
            label="Your plant date"
            value={plantDate}
            onChangeText={setPlantDate}
            placeholder="YYYY-MM-DD"
          />

          {summary.harvestDate ? (
            <View style={styles.harvestBanner}>
              <Text style={styles.harvestLabel}>Expected harvest</Text>
              <Text style={styles.harvestValue}>{summary.harvestLabel}</Text>
              <Text style={styles.harvestHint}>
                Based on {activeGuide.maturityDays} days from {formatDisplayDate(plantDate)}
              </Text>
            </View>
          ) : (
            <GuideRow label="Harvest window" value={activeGuide.harvestWindow} />
          )}

          <FieldPicker
            userId={userId}
            value={fieldId}
            onChange={(id, field) => {
              setFieldId(id);
              setFieldName(field?.name ?? '');
            }}
            label="Which field?"
          />

          <Button title="Add to my calendar" onPress={handleSave} loading={saving} fullWidth />
        </View>
      ) : query.trim() ? (
        <Card style={styles.noGuide}>
          <Text style={styles.noGuideText}>
            No guide for “{query.trim()}” — you can still add it manually below.
          </Text>
          <Input label="Plant date" value={plantDate} onChangeText={setPlantDate} placeholder="YYYY-MM-DD" />
          <FieldPicker
            userId={userId}
            value={fieldId}
            onChange={(id, field) => {
              setFieldId(id);
              setFieldName(field?.name ?? '');
            }}
          />
          <Button
            title="Add custom crop"
            variant="outline"
            onPress={handleSave}
            loading={saving}
            fullWidth
          />
        </Card>
      ) : null}
    </Card>
  );
}

function GuideRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.guideRow}>
      <Text style={styles.guideLabel}>{label}</Text>
      <Text style={styles.guideValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  title: { ...typography.h3, color: colors.primaryDark, marginBottom: spacing.xs },
  subtitle: { ...typography.caption, marginBottom: spacing.md, lineHeight: 18 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  suggestionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  suggestionText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  cropRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  cropChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cropChipActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
  cropChipText: { ...typography.caption, color: colors.textSecondary },
  cropChipTextActive: { color: colors.primary, fontWeight: '700' },
  guideBox: { marginTop: spacing.sm },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  guideHeading: { ...typography.h3, fontSize: 18, color: colors.primary, flex: 1 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  badgeGood: { backgroundColor: colors.surfaceAlt },
  badgeWait: { backgroundColor: '#FFF8E7' },
  badgeText: { ...typography.caption, fontWeight: '700', color: colors.primaryDark },
  guideRow: { marginBottom: spacing.sm },
  guideLabel: { ...typography.caption, fontWeight: '700', color: colors.textMuted },
  guideValue: { ...typography.bodySmall, lineHeight: 20, marginTop: 2 },
  harvestBanner: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  harvestLabel: { ...typography.caption, fontWeight: '700' },
  harvestValue: { ...typography.h3, color: colors.primaryDark, marginTop: 4 },
  harvestHint: { ...typography.caption, marginTop: 4, fontStyle: 'italic' },
  noGuide: { marginTop: spacing.sm, backgroundColor: colors.surface },
  noGuideText: { ...typography.bodySmall, marginBottom: spacing.md, lineHeight: 20 },
});
