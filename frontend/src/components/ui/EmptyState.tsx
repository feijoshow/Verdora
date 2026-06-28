import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../constants/theme';
import { Button } from './Button';
import { Card } from './Card';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  title?: string;
  message: string;
  action?: EmptyStateAction;
  variant?: 'default' | 'muted' | 'error';
  style?: ViewStyle;
}

export function EmptyState({
  title,
  message,
  action,
  variant = 'default',
  style,
}: EmptyStateProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { alignItems: 'center', gap: spacing.sm },
        title: { ...typography.h3, fontSize: 16, color: colors.primary, textAlign: 'center' },
        message: { ...typography.bodySmall, textAlign: 'center', lineHeight: 20, color: colors.textSecondary },
        mutedMessage: {
          ...typography.bodySmall,
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: 20,
          color: colors.textMuted,
        },
        errorMessage: { ...typography.bodySmall, textAlign: 'center', color: colors.error, lineHeight: 20 },
        action: { marginTop: spacing.xs, alignSelf: 'stretch' },
      }),
    [colors, typography],
  );

  const cardVariant = variant === 'muted' ? 'default' : 'highlight';
  const messageStyle =
    variant === 'error'
      ? styles.errorMessage
      : variant === 'muted'
        ? styles.mutedMessage
        : styles.message;

  return (
    <Card variant={cardVariant} style={style}>
      <View style={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={messageStyle}>{message}</Text>
        {action ? (
          <Button title={action.label} onPress={action.onPress} variant="outline" style={styles.action} />
        ) : null}
      </View>
    </Card>
  );
}
