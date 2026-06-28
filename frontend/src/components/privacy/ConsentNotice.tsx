import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { DATA_CONSENT_DETAILS, DATA_CONSENT_NOTICE } from '../../constants/privacy';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';

interface ConsentNoticeProps {
  checked: boolean;
  onToggle: () => void;
  expanded?: boolean;
}

export function ConsentNotice({ checked, onToggle, expanded = true }: ConsentNoticeProps) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: {
          backgroundColor: colors.surfaceAlt,
          borderRadius: borderRadius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        row: { flexDirection: 'row', alignItems: 'flex-start' },
        checkbox: {
          width: 22,
          height: 22,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: colors.primary,
          marginRight: spacing.sm,
          alignItems: 'center',
          justifyContent: 'center',
        },
        checkboxChecked: { backgroundColor: colors.primary },
        checkmark: { color: colors.white, fontSize: 14, fontWeight: '700' },
        notice: { ...typography.bodySmall, flex: 1, lineHeight: 20, color: colors.text },
        details: { marginTop: spacing.sm, paddingLeft: spacing.lg + 4 },
        bullet: { ...typography.caption, lineHeight: 18, marginBottom: 4, color: colors.textSecondary },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.box}>
      <Pressable style={styles.row} onPress={onToggle}>
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.notice}>{DATA_CONSENT_NOTICE}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          {DATA_CONSENT_DETAILS.map((line) => (
            <Text key={line} style={styles.bullet}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
