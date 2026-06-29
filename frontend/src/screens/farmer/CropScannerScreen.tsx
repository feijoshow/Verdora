import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/navigation/ScreenHeader';
import { Button, InlineLoader, Input, ScreenWrapper } from '../../components/ui';
import { DiagnosisHistoryList } from '../../components/scanner/DiagnosisHistoryList';
import { useAuth } from '../../context/AuthContext';
import { useDiagnosis } from '../../context/DiagnosisContext';
import { useFeedback } from '../../context/FeedbackContext';
import { diagnoseCropImage } from '../../services/api/cropDiagnosisService';
import { toApiError } from '../../services/api/errors';
import { FieldPicker } from '../../components/fields/FieldPicker';
import type { FarmField } from '../../types/field';
import { setLastSelectedFieldId } from '../../services/fields/fieldService';
import { useTheme } from '../../context/ThemeContext';
import { spacing, borderRadius } from '../../constants/theme';
import type { FarmerStackParamList, FarmerTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<FarmerTabParamList, 'Scanner'>,
  NativeStackScreenProps<FarmerStackParamList>
>;

const SCAN_STAGES = [
  'Reading image…',
  'Identifying crop…',
  'Checking for disease…',
  'Preparing advice…',
];

export function CropScannerScreen({ navigation }: Props) {
  const { colors, typography } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const promptSectionY = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState(SCAN_STAGES[0]);
  const [cameraReady, setCameraReady] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<FarmField | null>(null);
  const [scanPrompt, setScanPrompt] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const { user } = useAuth();
  const { history, addDiagnosis } = useDiagnosis();
  const { showWarning, showInfo } = useFeedback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { ...typography.h2, color: colors.primary },
        subtitle: { ...typography.bodySmall, marginTop: spacing.xs, color: colors.textSecondary },
        cameraContainer: {
          height: Platform.OS === 'web' ? 260 : 300,
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
          backgroundColor: colors.scrimLight,
        },
        frame: {
          width: '75%',
          height: '55%',
          borderWidth: 2,
          borderColor: colors.primaryLight,
          borderRadius: borderRadius.md,
          borderStyle: 'dashed',
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
        actions: { paddingHorizontal: spacing.md, marginTop: spacing.md, gap: spacing.sm },
        promptSection: { paddingHorizontal: spacing.md, marginTop: spacing.md },
        fieldPicker: { paddingHorizontal: spacing.md, marginTop: spacing.xs },
        historySection: { paddingHorizontal: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg },
        historyToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          marginBottom: spacing.sm,
        },
        historyToggleText: { ...typography.bodySmall, fontWeight: '600', color: colors.textSecondary },
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
      }),
    [colors, typography],
  );

  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisStage(SCAN_STAGES[0]);
      return;
    }

    let stageIndex = 0;
    setAnalysisStage(SCAN_STAGES[0]);
    const interval = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, SCAN_STAGES.length - 1);
      setAnalysisStage(SCAN_STAGES[stageIndex]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const runDiagnosis = useCallback(
    async (uri: string) => {
      if (!user) {
        Alert.alert('Sign in required', 'Please log in to scan crops.');
        return;
      }
      setIsAnalyzing(true);
      try {
        const trimmedPrompt = scanPrompt.trim();
        const { result, notice } = await diagnoseCropImage(uri, user, {
          scanPrompt: trimmedPrompt || undefined,
        });
        const tagged = {
          ...result,
          fieldId: selectedField?.id,
          fieldName: selectedField?.name,
          imageUri: result.imageUri ?? uri,
          scanPrompt: trimmedPrompt || undefined,
        };

        setPreviewUri(null);
        navigation.navigate('DiagnosisResults', { result: tagged });

        addDiagnosis(tagged, selectedField ?? undefined).catch(() => {
          showWarning('Scan saved locally, but cloud sync failed. Results are still shown.');
        });
        if (selectedField) {
          setLastSelectedFieldId(user.id, selectedField.id).catch(() => undefined);
        }
        if (notice) {
          if (result.confidence < 0.45) showWarning(notice);
          else showInfo(notice);
        }
      } catch (error) {
        Alert.alert(
          'Analysis failed',
          toApiError(error).message ||
            'Could not analyze the image. Check your connection and try a clearer photo.',
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [addDiagnosis, navigation, scanPrompt, selectedField, showInfo, showWarning, user],
  );

  const handleCapture = async () => {
    if (!cameraRef.current || !cameraReady) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPreviewUri(photo.uri);
      }
    } catch {
      Alert.alert('Capture failed', 'Unable to take a photo. Please try again.');
    }
  };

  const handleAnalyzePreview = async () => {
    if (!previewUri) return;
    await runDiagnosis(previewUri);
  };

  const handleRetake = () => {
    setPreviewUri(null);
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
      setPreviewUri(result.assets[0].uri);
    }
  };

  const openHistoryItem = (result: (typeof history)[0]) => {
    navigation.navigate('DiagnosisResults', { result });
  };

  const scrollToPrompt = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, promptSectionY.current - spacing.lg),
        animated: true,
      });
    }, 120);
  }, []);

  if (!permission) {
    return (
      <ScreenWrapper scrollable={false}>
        <InlineLoader size="large" />
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
    <ScreenWrapper
      padded={false}
      keyboardAvoiding
      keyboardVerticalOffset={64}
      scrollRef={scrollRef}
    >
      <ScreenHeader banner title="Scan" />

      <View style={styles.cameraContainer}>
        {previewUri && !isAnalyzing ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
          </View>
        ) : previewUri && isAnalyzing ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: previewUri }} style={styles.preview} />
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.analyzingText}>{analysisStage}</Text>
            </View>
          </View>
        ) : Platform.OS === 'web' ? (
          <View style={styles.webPlaceholder}>
            <Text style={styles.webEmoji}>📷</Text>
            <Text style={styles.webHint}>Use gallery upload on web</Text>
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
            </View>
          </CameraView>
        )}
      </View>

      <View
        style={styles.promptSection}
        onLayout={(event) => {
          promptSectionY.current = event.nativeEvent.layout.y;
        }}
      >
        <Input
          label="What should we look for?"
          placeholder="e.g. yellow spots on leaves, pest damage, is this healthy?"
          value={scanPrompt}
          onChangeText={setScanPrompt}
          onFocus={scrollToPrompt}
          multiline
          maxLength={200}
          editable={!isAnalyzing}
        />
      </View>

      <View style={styles.actions}>
        {previewUri && !isAnalyzing ? (
          <>
            <Button title="Analyze photo" onPress={handleAnalyzePreview} fullWidth />
            <Button title="Retake" variant="outline" onPress={handleRetake} fullWidth />
          </>
        ) : (
          <>
            {Platform.OS !== 'web' && !previewUri && (
              <Button
                title="Take photo"
                onPress={handleCapture}
                disabled={!cameraReady || isAnalyzing}
                fullWidth
              />
            )}
            <Button
              title={previewUri ? 'Choose another' : 'Upload from gallery'}
              variant="outline"
              onPress={handlePickImage}
              disabled={isAnalyzing}
              fullWidth
            />
          </>
        )}
      </View>

      {user ? (
        <View style={styles.fieldPicker}>
          <FieldPicker
            userId={user.id}
            value={selectedFieldId}
            onChange={(id, field) => {
              setSelectedFieldId(id);
              setSelectedField(field);
            }}
            label="Field (optional)"
          />
        </View>
      ) : null}

      {history.length > 0 ? (
        <View style={styles.historySection}>
          <Pressable
            style={styles.historyToggle}
            onPress={() => setShowHistory((v) => !v)}
          >
            <Text style={styles.historyToggleText}>
              Recent scans ({history.length})
            </Text>
            <Ionicons
              name={showHistory ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
          {showHistory ? (
            <DiagnosisHistoryList items={history.slice(0, 3)} onPressItem={openHistoryItem} />
          ) : null}
        </View>
      ) : null}
    </ScreenWrapper>
  );
}
