import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '../ui';
import { usePrivacy } from '../../context/PrivacyContext';
import { useTheme } from '../../context/ThemeContext';
import { DATA_CONSENT_NOTICE } from '../../constants/privacy';
import { spacing } from '../../constants/theme';

/** Opt-in / opt-out toggle for analytics data collection */
export function PrivacySettingsCard({ embedded = false }: { embedded?: boolean }) {
  const { hasConsent, setConsent, isCloudSyncEnabled, canCollectData } = usePrivacy();
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: { marginBottom: spacing.md },
        title: { ...typography.h3, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
        body: { ...typography.bodySmall, lineHeight: 20, marginBottom: spacing.md, color: colors.text },
        statusRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
        statusLabel: { ...typography.caption, color: colors.textSecondary },
        statusValue: { ...typography.caption, fontWeight: '700', color: colors.text },
        on: { color: colors.success },
        off: { color: colors.textMuted },
        hint: { ...typography.caption, fontStyle: 'italic', marginTop: spacing.sm, color: colors.textMuted },
        actions: { marginTop: spacing.md, alignItems: 'center' },
        link: { ...typography.bodySmall, color: colors.primary, fontWeight: '700' },
        linkOff: { ...typography.bodySmall, color: colors.error, fontWeight: '600' },
      }),
    [colors, typography],
  );

  const content = (
    <>
      {!embedded ? <Text style={styles.title}>Privacy & data collection</Text> : null}
      <Text style={styles.body}>{DATA_CONSENT_NOTICE}</Text>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Analytics collection</Text>
        <Text style={[styles.statusValue, canCollectData ? styles.on : styles.off]}>
          {canCollectData ? 'ON' : 'OFF'}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Cloud sync (Supabase)</Text>
        <Text style={styles.statusValue}>{isCloudSyncEnabled ? 'Connected' : 'Local only'}</Text>
      </View>

      <Text style={styles.hint}>
        We never sell personal data. Only aggregated regional insights are used in reports.
      </Text>

      <View style={styles.actions}>
        {!hasConsent ? (
          <Text style={styles.link} onPress={() => setConsent(true)}>
            Enable data collection
          </Text>
        ) : (
          <Text style={styles.linkOff} onPress={() => setConsent(false)}>
            Opt out of data collection
          </Text>
        )}
      </View>
    </>
  );

  if (embedded) return <View>{content}</View>;

  return (
    <Card variant="highlight" style={styles.card}>
      {content}
    </Card>
  );
}
