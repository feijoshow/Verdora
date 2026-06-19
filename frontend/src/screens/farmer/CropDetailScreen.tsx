import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Card, Button, ScreenWrapper } from '../../components/ui';
import { SmartPlantingCalendar } from '../../components/calendar/SmartPlantingCalendar';
import { createPlantingEvent } from '../../services/api/plantationCalendarService';
import { trackFarmingRecord } from '../../services/analytics/dataCollectionService';
import { useNavigation } from '@react-navigation/native';
import { getCropByName, recommendByWeather } from '../../services/api/cropLibraryService';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, typography } from '../../constants/theme';
import type { CropEntry } from '../../services/api/cropLibraryService';
import { useAuth } from '../../context/AuthContext';
import { getWeather } from '../../services/api/weatherService';

export function CropDetailScreen() {
  const route = useRoute<any>();
  const cropName: string = route.params?.cropName;
  const [crop, setCrop] = useState<CropEntry | null>(null);
  const { user } = useAuth();
  const [weatherNote, setWeatherNote] = useState<string | null>(null);
  const nav = useNavigation<any>();

  useEffect(() => {
    (async () => {
      const c = await getCropByName(cropName);
      setCrop(c);
      if (c && user) {
        try {
          const w = await getWeather(user);
          const rec = recommendByWeather(c, w as any);
          setWeatherNote(rec.text);
        } catch {
          // ignore
        }
      }
    })();
  }, [cropName, user]);

  if (!crop) return null;

  return (
    <ScreenWrapper>
      <ScreenHeader title={crop.crop_name} subtitle="Crop details & recommendations" />

      <SmartPlantingCalendar crop={crop} />
      <Card>
        <Text style={styles.cardTitle}>🌡️ Conditions</Text>
        <Text style={styles.cardText}>Temperature: {crop.temperature_range} °C</Text>
        <Text style={styles.cardText}>Recommended months: {crop.planting_window.join(', ')}</Text>
        {weatherNote ? <Text style={styles.cardHint}>{weatherNote}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.cardTitle}>🌱 Planting</Text>
        <Text style={styles.cardText}>Spacing: {crop.spacing}</Text>
        <Text style={styles.cardText}>Maturity: {crop.maturity_days} days</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>💧 Water</Text>
        <Text style={styles.cardText}>{crop.water_requirement}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>📈 Yield estimate</Text>
        <Text style={styles.cardText}>{crop.yield_estimate}</Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>⏳ Growth duration</Text>
        <Text style={styles.cardText}>{crop.maturity_days} days until maturity (approx.)</Text>
      </Card>

      <View style={styles.actions}>
        <Button
          title="Add to my calendar"
          onPress={async () => {
            if (!user || !crop) return;
            const now = new Date();
            const monthNames = [
              'January','February','March','April','May','June','July','August','September','October','November','December'
            ];
            const preferred = crop.planting_window?.[0] ?? monthNames[now.getMonth()];
            const monthIdx = monthNames.indexOf(preferred);
            const year = now.getMonth() <= monthIdx ? now.getFullYear() : now.getFullYear() + 1;
            const plantDate = new Date(year, monthIdx, 1).toISOString().slice(0,10);
            const harvestDate = crop.maturity_days
              ? new Date(new Date(plantDate).getTime() + crop.maturity_days * 24*60*60*1000).toISOString().slice(0,10)
              : undefined;

            try {
              const payload = {
                cropName: crop.crop_name,
                plantDate,
                harvestDate,
                fieldName: undefined,
                notes: `Auto-added from crop library`,
              } as any;
              const saved = await createPlantingEvent(user.id, payload, user);
              await trackFarmingRecord(user, saved);
              nav.navigate('FarmerTabs', { screen: 'Calendar' });
            } catch (e) {
              // ignore errors for now
            }
          }}
          fullWidth
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.h3, marginBottom: spacing.xs },
  cardText: { ...typography.bodySmall, marginBottom: spacing.xs },
  cardHint: { ...typography.caption, fontStyle: 'italic', marginTop: spacing.xs },
  actions: { marginTop: spacing.md, marginBottom: spacing.lg },
});
