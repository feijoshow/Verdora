import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { DiagnosisProvider } from './src/context/DiagnosisContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DiagnosisProvider>
          <RootNavigator />
          <StatusBar style="dark" />
        </DiagnosisProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
