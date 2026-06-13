import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../../context/AuthContext';
import { RootNavigator } from '../../navigation/RootNavigator';
import { AppSplash } from './AppSplash';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Holds splash until auth is ready, then reveals the app */
export function AppBootstrap() {
  const { isLoading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashDone = useCallback(() => setSplashDone(true), []);

  useEffect(() => {
    if (!isLoading && splashDone) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isLoading, splashDone]);

  return (
    <View style={styles.root}>
      <RootNavigator showApp={splashDone && !isLoading} />
      {!splashDone && <AppSplash ready={!isLoading} onDone={handleSplashDone} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
