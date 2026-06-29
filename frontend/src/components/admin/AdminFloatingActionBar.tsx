import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';
import {
  ADMIN_ACTION_BAR_FLOAT_MARGIN,
  ADMIN_ACTION_BAR_HEIGHT,
  ADMIN_ACTION_BAR_HORIZONTAL_MARGIN,
} from './adminActionBarConstants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AdminFloatingActionBarProps {
  onGenerateInsights: () => void;
  onExportPdf: () => void;
  onExportJson: () => void;
  generating?: boolean;
  exportingFormat?: 'json' | 'pdf' | null;
}

interface ActionItem {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  accent?: boolean;
}

export function AdminFloatingActionBar({
  onGenerateInsights,
  onExportPdf,
  onExportJson,
  generating = false,
  exportingFormat = null,
}: AdminFloatingActionBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, shadows, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: ADMIN_ACTION_BAR_HORIZONTAL_MARGIN,
        },
        pill: {
          flexDirection: 'row',
          alignItems: 'center',
          height: ADMIN_ACTION_BAR_HEIGHT,
          borderRadius: borderRadius.full,
          backgroundColor: colors.tabBarBackground,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.xs,
          ...shadows.tabBar,
        },
        action: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing.xs,
          gap: 2,
        },
        actionPressed: { opacity: 0.75 },
        actionDisabled: { opacity: 0.45 },
        label: {
          ...typography.caption,
          fontSize: 10,
          fontWeight: '600',
          color: colors.textMuted,
          textAlign: 'center',
        },
        labelAccent: { color: colors.primary },
        divider: {
          width: 1,
          height: 28,
          backgroundColor: colors.border,
        },
      }),
    [colors, shadows, typography],
  );

  const exportBusy = exportingFormat !== null;
  const actions: ActionItem[] = [
    {
      key: 'insights',
      icon: 'sparkles',
      label: 'Insights',
      onPress: onGenerateInsights,
      loading: generating,
      disabled: exportBusy,
      accent: true,
    },
    {
      key: 'pdf',
      icon: 'document-text',
      label: 'PDF',
      onPress: onExportPdf,
      loading: exportingFormat === 'pdf',
      disabled: generating || (exportBusy && exportingFormat !== 'pdf'),
    },
    {
      key: 'json',
      icon: 'code-download',
      label: 'JSON',
      onPress: onExportJson,
      loading: exportingFormat === 'json',
      disabled: generating || (exportBusy && exportingFormat !== 'json'),
    },
  ];

  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);

  return (
    <View pointerEvents="box-none" style={[styles.outer, { paddingBottom: bottomPad + ADMIN_ACTION_BAR_FLOAT_MARGIN }]}>
      <View style={styles.pill}>
        {actions.map((action, index) => (
          <React.Fragment key={action.key}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={action.onPress}
              disabled={action.disabled || action.loading}
              style={({ pressed }) => [
                styles.action,
                pressed && !action.disabled && styles.actionPressed,
                (action.disabled || action.loading) && styles.actionDisabled,
              ]}
            >
              {action.loading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.accent ? colors.primary : colors.textSecondary}
                />
              )}
              <Text style={[styles.label, action.accent && styles.labelAccent]} numberOfLines={1}>
                {action.label}
              </Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
