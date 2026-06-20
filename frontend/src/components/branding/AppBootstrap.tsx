import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import { RootNavigator } from '../../navigation/RootNavigator';
import { AppSplash } from './AppSplash';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Holds splash until auth is ready, then reveals the app */
export function AppBootstrap() {
  const { isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (!isLoading && splashDone) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading, splashDone]);

  const handleErrorReset = useCallback(() => setResetKey((k) => k + 1), []);

  return (
    <View style={styles.root}>
      <ErrorBoundary key={resetKey} onReset={handleErrorReset}>
        <RootNavigator showApp={splashDone && !isLoading} />
      </ErrorBoundary>
      {!splashDone && <AppSplash ready={!isLoading} onDone={handleSplashDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
