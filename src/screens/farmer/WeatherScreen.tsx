import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card, ScreenWrapper } from '../../components/ui';
import { PlantingRecommendationCard } from '../../components/weather/PlantingRecommendationCard';
import { useAuth } from '../../context/AuthContext';
import { getWeather } from '../../services/api/weatherService';
import { toApiError } from '../../services/api/errors';
import type { WeatherResponse } from '../../services/api/types';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';

function weatherEmoji(icon: string): string {
  if (icon.includes('rain')) return '🌧️';
  if (icon.includes('cloud')) return '⛅';
  if (icon.includes('clear') || icon === '01d') return '☀️';
  return '🌤️';
}

export function WeatherScreen() {
  const { user } = useAuth();
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const city = user?.location?.split(',')[0]?.trim() ?? 'Laguna';

  const loadWeather = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const data = await getWeather({ city });
      setWeather(data);
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  return (
    <ScreenWrapper
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadWeather(true)}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>Weather Dashboard</Text>
      <Text style={styles.subtitle}>Forecasts & planting recommendations for {city}</Text>

      {loading && !weather ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <Card variant="highlight">
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : weather ? (
        <>
          <Card variant="elevated" style={styles.weatherCard}>
            <View style={styles.weatherMain}>
              <Text style={styles.weatherEmoji}>{weatherEmoji(weather.icon)}</Text>
              <View>
                <Text style={styles.temp}>{weather.temperature}°C</Text>
                <Text style={styles.condition}>{weather.condition}</Text>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Humidity</Text>
                <Text style={styles.statValue}>{weather.humidity}%</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Location</Text>
                <Text style={styles.statValue} numberOfLines={1}>
                  {weather.location}
                </Text>
              </View>
            </View>
            {weather.recommendation ? (
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>💡 Farming tip</Text>
                <Text style={styles.tipText}>{weather.recommendation}</Text>
              </View>
            ) : null}
          </Card>

          <Text style={styles.sectionTitle}>Best planting times</Text>
          {weather.plantingWindows?.length ? (
            weather.plantingWindows.map((item) => (
              <PlantingRecommendationCard key={item.cropName} item={item} />
            ))
          ) : (
            <Card>
              <Text style={styles.empty}>No planting recommendations available.</Text>
            </Card>
          )}
        </>
      ) : null}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.primary, marginTop: spacing.md },
  subtitle: { ...typography.bodySmall, marginBottom: spacing.lg },
  loader: { marginTop: spacing.xxl },
  errorText: { ...typography.bodySmall, color: colors.error },
  weatherCard: { marginBottom: spacing.lg },
  weatherMain: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  weatherEmoji: { fontSize: 56, marginRight: spacing.md },
  temp: { fontSize: 36, fontWeight: '700', color: colors.primaryDark },
  condition: { ...typography.body, textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  statLabel: { ...typography.caption, marginBottom: 4 },
  statValue: { ...typography.bodySmall, fontWeight: '600', color: colors.primary },
  tipBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
  },
  tipLabel: { ...typography.caption, fontWeight: '700', marginBottom: spacing.xs },
  tipText: { ...typography.bodySmall, lineHeight: 20 },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  empty: { ...typography.bodySmall, textAlign: 'center' },
});
