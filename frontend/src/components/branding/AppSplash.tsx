import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { colors, logoSize, spacing, typography } from '../../constants/theme';

const LOGO = require('../../../assets/verdora-logo.png');
const SPLASH_SEEN_KEY = '@verdora_splash_seen';
const MIN_SPLASH_MS_FIRST = 2800;
const MIN_SPLASH_MS_RETURN = 1200;
const useNativeDriver = Platform.OS !== 'web';

interface AppSplashProps {
  /** App finished loading (e.g. auth restored) */
  ready: boolean;
  onDone: () => void;
}

/** Animated logo splash shown on app entry */
export function AppSplash({ ready, onDone }: AppSplashProps) {
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const minTimeDone = useRef(false);
  const exitStarted = useRef(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const [minSplashMs, setMinSplashMs] = useState(MIN_SPLASH_MS_FIRST);

  const tryExit = useCallback(() => {
    if (!readyRef.current || !minTimeDone.current || exitStarted.current) return;
    exitStarted.current = true;
    AsyncStorage.setItem(SPLASH_SEEN_KEY, '1').catch(() => undefined);
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 420,
      useNativeDriver,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [onDone, overlayOpacity]);

  useEffect(() => {
    AsyncStorage.getItem(SPLASH_SEEN_KEY)
      .then((seen) => {
        if (seen) setMinSplashMs(MIN_SPLASH_MS_RETURN);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver,
        }),
      ]),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver,
      }),
    ]).start(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    });

    minTimeDone.current = false;
    exitStarted.current = false;
    const timer = setTimeout(() => {
      minTimeDone.current = true;
      tryExit();
    }, minSplashMs);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, minSplashMs, titleOpacity, tryExit]);

  useEffect(() => {
    tryExit();
  }, [ready, tryExit]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity, pointerEvents: 'auto' }]}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Verdora logo" />
        </Animated.View>
        <Animated.Text style={[styles.title, { opacity: titleOpacity }]}>Verdora</Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: titleOpacity }]}>
          Agricultural intelligence for your farm
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: {
    width: logoSize,
    height: logoSize,
  },
  title: {
    ...typography.h1,
    color: colors.primaryDark,
    marginTop: spacing.lg,
    letterSpacing: 0.5,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
