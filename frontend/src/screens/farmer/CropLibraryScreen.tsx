import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { ScreenWrapper, Card, Input, Button } from '../../components/ui';
import { listCrops, searchCrops } from '../../services/api/cropLibraryService';
import type { CropEntry } from '../../services/api/cropLibraryService';
import { colors, spacing, typography } from '../../constants/theme';
import type { FarmerStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<FarmerStackParamList, 'CropLibrary'>;

export function CropLibraryScreen({ navigation }: Props) {
  const [items, setItems] = useState<CropEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q = '') => {
    setLoading(true);
    setError(null);
    try {
      setItems(q.trim() ? await searchCrops(q) : await listCrops());
    } catch {
      setError('Could not load the crop library. Pull down to try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <FlatList
        style={styles.list}
        data={items}
        keyExtractor={(i) => i.crop_name}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={() => load(query)}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title="Crop Library"
              subtitle="Browse crops and planting guidance"
              showBack
            />
            <Input
              placeholder="Search crops"
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                load(text);
              }}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{error}</Text>
              <Button title="Try again" onPress={() => load(query)} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No crops found</Text>
              <Text style={styles.emptyText}>Try a different search term.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('CropDetail', { cropName: item.crop_name })}
          >
            <Card style={styles.card}>
              <Text style={styles.title}>{item.crop_name}</Text>
              <Text style={styles.meta}>Best months: {item.planting_window.join(', ')}</Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  header: { paddingTop: spacing.sm },
  loader: { marginTop: spacing.xl },
  card: { marginVertical: spacing.xs },
  title: { ...typography.h3, color: colors.primaryDark },
  meta: { ...typography.caption, marginTop: spacing.xs },
  empty: { padding: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.h3, color: colors.primary },
  emptyText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center' },
});
