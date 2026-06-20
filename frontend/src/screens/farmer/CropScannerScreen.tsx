import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Button, ScreenWrapper } from '../../components/ui';
import { DiagnosisHistoryList } from '../../components/scanner/DiagnosisHistoryList';
import { useAuth } from '../../context/AuthContext';
import { useDiagnosis } from '../../context/DiagnosisContext';
import { useFeedback } from '../../context/FeedbackContext';
import { diagnoseCropImage } from '../../services/api/cropDiagnosisService';
import { FieldPicker } from '../../components/fields/FieldPicker';
import type { FarmField } from '../../types/field';
import { setLastSelectedFieldId } from '../../services/fields/fieldService';
import { colors, spacing, typography, borderRadius } from '../../constants/theme';
import type { FarmerStackParamList, FarmerTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<FarmerTabParamList, 'Scanner'>,
  NativeStackScreenProps<FarmerStackParamList>
>;

export function CropScannerScreen({ navigation }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FarmField | null>(null);
  const { user } = useAuth();
  const { history, addDiagnosis } = useDiagnosis();
  const { showWarning, showInfo } = useFeedback();

  const runDiagnosis = useCallback(
    async (uri: string) => {
      if (!user) {
        Alert.alert('Sign in required', 'Please log in to scan crops.');
        return;
      }
      setIsAnalyzing(true);
      try {
        const { result, notice } = await diagnoseCropImage(uri, user);
        const tagged = {
          ...result,
          fieldId: selectedField?.id,
          fieldName: selectedField?.name,
        };
        await addDiagnosis(tagged, selectedField ?? undefined);
        if (selectedField) await setLastSelectedFieldId(user.id, selectedField.id);
        if (notice) {
          if (result.confidence < 0.45) showWarning(notice);
          else showInfo(notice);
        }
        navigation.navigate('DiagnosisResults', { result: tagged });
        setPreviewUri(null);
      } catch {
        Alert.alert(
          'Analysis failed',
          'Could not analyze the image. Check your connection and try a clearer photo.',
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [addDiagnosis, navigation, selectedField, showInfo, showWarning, user],
  );

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPreviewUri(photo.uri);
        await runDiagnosis(photo.uri);
      }
    } catch {
      Alert.alert('Capture failed', 'Unable to take a photo. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      const uri = result.assets[0].uri;
      setPreviewUri(uri);
      await runDiagnosis(uri);
    }
  };

  const openHistoryItem = (result: (typeof history)[0]) => {
    navigation.navigate('DiagnosisResults', { result });
  };

  // Permission gate
  if (!permission) {
    return (
      <ScreenWrapper scrollable={false}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.centered} />
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper>
        <Text style={styles.title}>Camera access required</Text>
        <Text style={styles.subtitle}>
          Verdora needs your camera to scan crops and detect diseases.
        </Text>
        <Button title="Grant permission" onPress={requestPermission} fullWidth />
        <View style={styles.divider} />
        <Button title="Upload from gallery instead" variant="outline" onPress={handlePickImage} fullWidth />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <ScreenHeader
        title="Crop Scanner"
        subtitle="Tag scans to a field — add plots in Profile first"
      />

      {user ? (
        <View style={styles.fieldPicker}>
          <FieldPicker
            userId={user.id}
            value={selectedFieldId}
            onChange={(id, field) => {
              setSelectedFieldId(id);
              setSelectedField(field);
            }}
            label="Scan this field"
          />
        </View>
      ) : null}

      {/* Camera / preview area */}
      <View style={styles.cameraContainer}>
        {previewUri && isAnalyzing ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.analyzingText}>Analyzing your crop…</Text>
              <Text style={styles.analyzingHint}>This usually takes a few seconds</Text>
            </View>
          </View>
        ) : Platform.OS === 'web' ? (
          <View style={styles.webPlaceholder}>
            <Text style={styles.webEmoji}>📷</Text>
            <Text style={styles.webHint}>Camera preview is available on mobile. Use gallery upload below.</Text>
          </View>
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onCameraReady={() => setCameraReady(true)}
          >
            <View style={styles.frameOverlay}>
              <View style={styles.frame} />
              <Text style={styles.frameHint}>Align the affected leaf or plant in the frame</Text>
            </View>
          </CameraView>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        {Platform.OS !== 'web' && (
          <Button
            title={isAnalyzing ? 'Analyzing…' : 'Capture & Diagnose'}
            onPress={handleCapture}
            loading={isAnalyzing}
            disabled={!cameraReady || isAnalyzing}
            fullWidth
          />
        )}
        <Button
          title="Upload from Gallery"
          variant="outline"
          onPress={handlePickImage}
          disabled={isAnalyzing}
          fullWidth
        />
      </View>

      {/* Diagnosis history */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Recent diagnoses</Text>
        <DiagnosisHistoryList items={history} onPressItem={openHistoryItem} />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centered: { marginTop: spacing.xxl },
  header: { paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  title: { ...typography.h2, color: colors.primary },
  subtitle: { ...typography.bodySmall, marginTop: spacing.xs },
  cameraContainer: {
    height: Platform.OS === 'web' ? 280 : 340,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primaryDark,
  },
  camera: { flex: 1 },
  frameOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  frame: {
    width: '75%',
    height: '55%',
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
  },
  frameHint: {
    ...typography.caption,
    color: colors.white,
    marginTop: spacing.md,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  previewWrap: { flex: 1, position: 'relative' },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: { ...typography.body, color: colors.white, marginTop: spacing.md },
  analyzingHint: { ...typography.caption, color: colors.white, marginTop: spacing.xs, opacity: 0.9 },
  actions: { paddingHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
  fieldPicker: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  historySection: { paddingHorizontal: spacing.md, marginTop: spacing.lg },
  sectionTitle: { ...typography.h3, marginBottom: spacing.md },
  divider: { height: spacing.md },
  webPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
    padding: spacing.lg,
  },
  webEmoji: { fontSize: 48, marginBottom: spacing.md },
  webHint: { ...typography.bodySmall, color: colors.white, textAlign: 'center' },
});
