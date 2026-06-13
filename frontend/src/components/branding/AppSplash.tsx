import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors, typography } from '../../constants/theme';

const LOGO = require('../../../assets/verdora-logo.png');
const MIN_SPLASH_MS = 1400;

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

  const tryExit = useCallback(() => {
    if (!readyRef.current || !minTimeDone.current || exitStarted.current) return;
    exitStarted.current = true;
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 420,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [onDone, overlayOpacity]);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    });

    const timer = setTimeout(() => {
      minTimeDone.current = true;
      tryExit();
    }, MIN_SPLASH_MS);

    return () => clearTimeout(timer);
  }, [logoOpacity, logoScale, titleOpacity, tryExit]);

  useEffect(() => {
    tryExit();
  }, [ready, tryExit]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="auto">
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
    paddingHorizontal: 40,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    ...typography.h1,
    color: colors.primaryDark,
    marginTop: 20,
    letterSpacing: 0.5,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
