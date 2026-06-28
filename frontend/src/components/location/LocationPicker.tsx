import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import {
  NAMIBIA_REGIONS,
  getTownsForRegion,
  OTHER_TOWN_ID,
  type NamibiaRegion,
  type NamibiaTown,
  type VerdoraLocation,
} from '../../data/namibiaLocations';
import { useTheme } from '../../context/ThemeContext';
import { borderRadius, spacing } from '../../constants/theme';

interface LocationPickerProps {
  value: VerdoraLocation | null;
  onChange: (location: VerdoraLocation) => void;
  label?: string;
  error?: string;
}

type PickerStage = 'closed' | 'region' | 'town';

export function LocationPicker({ value, onChange, label = 'Location', error }: LocationPickerProps) {
  const { colors, typography } = useTheme();
  const [stage, setStage] = useState<PickerStage>('closed');
  const [pendingRegion, setPendingRegion] = useState<NamibiaRegion | null>(null);
  const [customTownText, setCustomTownText] = useState('');
  const [showCustomTownInput, setShowCustomTownInput] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { marginBottom: spacing.md },
        label: { ...typography.bodySmall, fontWeight: '600', color: colors.text, marginBottom: spacing.xs + 2 },
        field: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.sm + 6,
          backgroundColor: colors.surface,
        },
        fieldError: { borderColor: colors.error },
        fieldValue: { ...typography.body, fontWeight: '500', color: colors.text },
        fieldSubValue: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
        fieldPlaceholder: { ...typography.body, color: colors.textMuted },
        errorText: { ...typography.caption, color: colors.error, marginTop: spacing.xs },
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: borderRadius.lg + 2,
          borderTopRightRadius: borderRadius.lg + 2,
          maxHeight: '75%',
          paddingBottom: spacing.sm + 4,
        },
        sheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        sheetTitle: { ...typography.body, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
        sheetHeaderAction: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', width: 50 },
        headerSpacer: { width: 40 },
        row: {
          paddingVertical: spacing.sm + 6,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: colors.background,
        },
        rowText: { ...typography.bodySmall, fontSize: 15, color: colors.text },
        rowSubText: { ...typography.caption, color: colors.textMuted },
        otherRow: { backgroundColor: colors.primarySoft },
        otherRowText: { color: colors.primary, fontWeight: '600' },
        emptyListText: {
          ...typography.bodySmall,
          padding: spacing.lg,
          textAlign: 'center',
          color: colors.textMuted,
        },
        customTownWrap: { padding: spacing.md },
        customTownLabel: { ...typography.bodySmall, color: colors.text, marginBottom: spacing.sm + 2 },
        customTownInput: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.sm + 4,
          paddingHorizontal: spacing.sm + 6,
          fontSize: 16,
          marginBottom: spacing.sm + 6,
          color: colors.text,
          backgroundColor: colors.background,
        },
        confirmButton: {
          backgroundColor: colors.primary,
          borderRadius: borderRadius.md,
          paddingVertical: spacing.sm + 6,
          alignItems: 'center',
        },
        confirmButtonDisabled: { backgroundColor: colors.primaryLight, opacity: 0.5 },
        confirmButtonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
      }),
    [colors, typography],
  );

  const displayText = useMemo(() => {
    if (!value) return null;
    return `${value.townName}, ${value.regionName}`;
  }, [value]);

  const subText = useMemo(() => {
    if (!value || value.isCustomTown) return null;
    return value.constituency ? `${value.constituency} constituency` : null;
  }, [value]);

  function openPicker() {
    setPendingRegion(null);
    setShowCustomTownInput(false);
    setCustomTownText('');
    setStage('region');
  }

  function selectRegion(nextRegion: NamibiaRegion) {
    setPendingRegion(nextRegion);
    setShowCustomTownInput(false);
    setCustomTownText('');
    setStage('town');
  }

  function selectTown(town: NamibiaTown) {
    if (!pendingRegion) return;
    onChange({
      regionId: pendingRegion.id,
      regionName: pendingRegion.name,
      townId: town.id,
      townName: town.name,
      constituency: town.constituencies[0],
      isCustomTown: false,
    });
    setStage('closed');
  }

  function confirmCustomTown() {
    if (!pendingRegion || customTownText.trim().length === 0) return;
    onChange({
      regionId: pendingRegion.id,
      regionName: pendingRegion.name,
      townId: OTHER_TOWN_ID,
      townName: customTownText.trim(),
      isCustomTown: true,
    });
    setStage('closed');
  }

  function close() {
    setStage('closed');
  }

  const towns = pendingRegion ? getTownsForRegion(pendingRegion.id) : [];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={[styles.field, error ? styles.fieldError : null]}
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={displayText ? `Location: ${displayText}` : 'Select your location'}
      >
        {displayText ? (
          <View>
            <Text style={styles.fieldValue}>{displayText}</Text>
            {subText ? <Text style={styles.fieldSubValue}>{subText}</Text> : null}
          </View>
        ) : (
          <Text style={styles.fieldPlaceholder}>Select region and town/village</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={stage === 'region'} animationType="slide" transparent onRequestClose={close}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <SheetHeader title="Select your region" onClose={close} />
            <FlatList
              data={NAMIBIA_REGIONS}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => selectRegion(item)}>
                  <Text style={styles.rowText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={stage === 'town'} animationType="slide" transparent onRequestClose={close}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <SheetHeader
              title={pendingRegion ? `Town/village in ${pendingRegion.name}` : 'Select town/village'}
              onClose={close}
              onBack={() => setStage('region')}
            />

            {!showCustomTownInput ? (
              <FlatList
                data={towns}
                keyExtractor={(t) => t.id}
                ListFooterComponent={
                  <Pressable style={[styles.row, styles.otherRow]} onPress={() => setShowCustomTownInput(true)}>
                    <Text style={[styles.rowText, styles.otherRowText]}>My village isn't listed</Text>
                  </Pressable>
                }
                renderItem={({ item }) => (
                  <Pressable style={styles.row} onPress={() => selectTown(item)}>
                    <Text style={styles.rowText}>{item.name}</Text>
                    <Text style={styles.rowSubText}>
                      {item.constituencies[0]}
                      {item.constituencies.length > 1 ? ' +' : ''}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>
                    No listed towns yet for this region — please enter your village below.
                  </Text>
                }
              />
            ) : (
              <View style={styles.customTownWrap}>
                <Text style={styles.customTownLabel}>
                  Type the name of your town or village in {pendingRegion?.name}
                </Text>
                <TextInput
                  style={styles.customTownInput}
                  value={customTownText}
                  onChangeText={setCustomTownText}
                  placeholder="e.g. Onesi"
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                />
                <Pressable
                  style={[
                    styles.confirmButton,
                    customTownText.trim().length === 0 ? styles.confirmButtonDisabled : null,
                  ]}
                  onPress={confirmCustomTown}
                  disabled={customTownText.trim().length === 0}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function SheetHeader({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  const { colors, typography } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheetHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm + 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        sheetTitle: { ...typography.body, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
        sheetHeaderAction: { ...typography.bodySmall, color: colors.primary, fontWeight: '600', width: 50 },
        headerSpacer: { width: 40 },
      }),
    [colors, typography],
  );

  return (
    <View style={styles.sheetHeader}>
      {onBack ? (
        <Pressable onPress={onBack} accessibilityLabel="Back">
          <Text style={styles.sheetHeaderAction}>Back</Text>
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
      <Text style={styles.sheetTitle}>{title}</Text>
      <Pressable onPress={onClose} accessibilityLabel="Close">
        <Text style={styles.sheetHeaderAction}>Close</Text>
      </Pressable>
    </View>
  );
}
