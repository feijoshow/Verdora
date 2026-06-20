import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Card, Button, ScreenWrapper } from '../../components/ui';
import { SmartPlantingCalendar } from '../../components/calendar/SmartPlantingCalendar';
import { createPlantingEvent } from '../../services/api/plantationCalendarService';
import { trackFarmingRecord } from '../../services/analytics/dataCollectionService';
import { getCropByName, recommendByWeather } from '../../services/api/cropLibraryService';
import { colors, spacing, typography } from '../../constants/theme';
import type { CropEntry } from '../../services/api/cropLibraryService';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { getWeather } from '../../services/api/weatherService';
import { toApiError } from '../../services/api/errors';
import type { FarmerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FarmerStackParamList, 'CropDetail'>;

export function CropDetailScreen({ route, navigation }: Props) {
  const cropName = route.params.cropName;
  const [crop, setCrop] = useState<CropEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const [weatherNote, setWeatherNote] = useState<string | null>(null);
  const { showInfo, showError } = useFeedback();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const c = await getCropByName(cropName);
        if (!c) {
          setError(`Could not find "${cropName}" in the library.`);
          setCrop(null);
          return;
        }
        setCrop(c);
        if (user) {
          try {
            const w = await getWeather(user);
            const rec = recommendByWeather(c, w);
            setWeatherNote(rec.text);
            if (w.notice) showInfo(w.notice);
          } catch {
            // weather note optional
          }
        }
      } catch {
        setError('Could not load crop details. Go back and try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [cropName, user, showInfo]);

  if (loading) {
    return (
      <ScreenWrapper scrollable={false}>
        <ScreenHeader title="Crop details" showBack />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </ScreenWrapper>
    );
  }

  if (error || !crop) {
    return (
      <ScreenWrapper>
        <ScreenHeader title="Crop details" showBack />
        <Text style={styles.errorText}>{error ?? 'Crop not found.'}</Text>
        <Button title="Back to library" onPress={() => navigation.goBack()} fullWidth />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScreenHeader title={crop.crop_name} subtitle="Crop details & recommendations" showBack />

      <SmartPlantingCalendar crop={crop} />
      <Card>
        <Text style={styles.cardTitle}>Conditions</Text>
        <Text style={styles.cardText}>Temperature: {crop.temperature_range} °C</Text>
        <Text style={styles.cardText}>Recommended months: {crop.planting_window.join(', ')}</Text>
        {weatherNote ? <Text style={styles.cardHint}>{weatherNote}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Planting</Text>
        <Text style={styles.cardText}>Spacing: {crop.spacing}</Text>
        <Text style={styles.cardText}>Maturity: {crop.maturity_days} days</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Water</Text>
        <Text style={styles.cardText}>{crop.water_requirement}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Yield estimate</Text>
        <Text style={styles.cardText}>{crop.yield_estimate}</Text>
      </Card>

      <View style={styles.actions}>
        <Button
          title={saving ? 'Adding…' : 'Add to my calendar'}
          loading={saving}
          disabled={!user || saving}
          onPress={async () => {
            if (!user || !crop) return;
            setSaving(true);
            try {
              const now = new Date();
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
              ];
              const preferred = crop.planting_window?.[0] ?? monthNames[now.getMonth()];
              const monthIdx = monthNames.indexOf(preferred);
              const year = now.getMonth() <= monthIdx ? now.getFullYear() : now.getFullYear() + 1;
              const plantDate = new Date(year, monthIdx, 1).toISOString().slice(0, 10);
              const harvestDate = crop.maturity_days
                ? new Date(new Date(plantDate).getTime() + crop.maturity_days * 86400000)
                    .toISOString()
                    .slice(0, 10)
                : undefined;

              const saved = await createPlantingEvent(
                user.id,
                {
                  cropName: crop.crop_name,
                  plantDate,
                  harvestDate,
                  notes: 'Added from crop library',
                },
                user,
              );
              await trackFarmingRecord(user, saved);
              showInfo(`${crop.crop_name} added to your calendar.`);
              navigation.navigate('FarmerTabs', { screen: 'Calendar' });
            } catch (err) {
              showError(toApiError(err).message);
              Alert.alert('Could not save', toApiError(err).message);
            } finally {
              setSaving(false);
            }
          }}
          fullWidth
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: spacing.xxl },
  errorText: { ...typography.body, color: colors.error, marginBottom: spacing.md },
  cardTitle: { ...typography.h3, marginBottom: spacing.xs },
  cardText: { ...typography.bodySmall, marginBottom: spacing.xs },
  cardHint: { ...typography.caption, fontStyle: 'italic', marginTop: spacing.xs },
  actions: { marginTop: spacing.md, marginBottom: spacing.lg },
});
