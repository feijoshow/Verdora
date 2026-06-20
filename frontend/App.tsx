import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppBootstrap } from './src/components/branding/AppBootstrap';
import { AuthProvider } from './src/context/AuthContext';
import { DiagnosisProvider } from './src/context/DiagnosisContext';
import { FeedbackProvider } from './src/context/FeedbackContext';
import { PrivacyProvider } from './src/context/PrivacyContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <FeedbackProvider>
          <AuthProvider>
            <PrivacyProvider>
              <DiagnosisProvider>
                <AppBootstrap />
                <StatusBar style="dark" />
              </DiagnosisProvider>
            </PrivacyProvider>
          </AuthProvider>
        </FeedbackProvider>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
