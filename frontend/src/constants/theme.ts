/**
 * Verdora design tokens — light & dark palettes with shared spacing/radius.
 */
import { Platform } from 'react-native';

export type ColorScheme = 'light' | 'dark';

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  warning: string;
  success: string;
  white: string;
  black: string;
  overlay: string;
  scrimLight: string;
  errorSurface: string;
  warningSurface: string;
  primarySoft: string;
  primaryMuted: string;
  actionScan: string;
  actionPlant: string;
  actionWeather: string;
  actionChat: string;
  actionLibrary: string;
  /** Text on filled primary buttons */
  onPrimary: string;
  /** Text on filled secondary buttons */
  onSecondary: string;
  /** Banner / header on dark green */
  bannerText: string;
  bannerTextMuted: string;
  /** Input field background */
  inputBackground: string;
  /** Tab bar pill background */
  tabBarBackground: string;
  statusBarStyle: 'light' | 'dark';
};

export const lightColors: ThemeColors = {
  primary: '#2D6A4F',
  primaryDark: '#1B4332',
  primaryLight: '#52B788',
  secondary: '#D4A373',
  secondaryDark: '#BC6C25',
  background: '#F0F4F1',
  surface: '#FFFFFF',
  surfaceAlt: '#E8F3EC',
  text: '#1A1F1C',
  textSecondary: '#5A6560',
  textMuted: '#8E9994',
  border: '#E2EBE6',
  error: '#C1121F',
  warning: '#E9C46A',
  success: '#40916C',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(27, 67, 50, 0.6)',
  scrimLight: 'rgba(0, 0, 0, 0.12)',
  errorSurface: '#FDE8E8',
  warningSurface: '#FFF8E7',
  primarySoft: '#E8F5EE',
  primaryMuted: '#40916C',
  actionScan: '#2D6A4F',
  actionPlant: '#40916C',
  actionWeather: '#BC6C25',
  actionChat: '#1B4332',
  actionLibrary: '#52796F',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  bannerText: '#FFFFFF',
  bannerTextMuted: 'rgba(255,255,255,0.75)',
  inputBackground: '#E8F5EE',
  tabBarBackground: '#FFFFFF',
  statusBarStyle: 'dark',
};

export const darkColors: ThemeColors = {
  primary: '#52B788',
  primaryDark: '#1B4332',
  primaryLight: '#74C69D',
  secondary: '#E9B88A',
  secondaryDark: '#D4A373',
  background: '#0E1411',
  surface: '#1A221E',
  surfaceAlt: '#243029',
  text: '#EDF2EF',
  textSecondary: '#B5C4BB',
  textMuted: '#8A9990',
  border: '#2F4038',
  error: '#FF8A8A',
  warning: '#F4D58D',
  success: '#74C69D',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.72)',
  scrimLight: 'rgba(255, 255, 255, 0.1)',
  errorSurface: '#3D2222',
  warningSurface: '#3D3520',
  primarySoft: '#1E3329',
  primaryMuted: '#74C69D',
  actionScan: '#52B788',
  actionPlant: '#74C69D',
  actionWeather: '#E9B88A',
  actionChat: '#52B788',
  actionLibrary: '#74C69D',
  onPrimary: '#0E1411',
  onSecondary: '#0E1411',
  bannerText: '#FFFFFF',
  bannerTextMuted: 'rgba(255,255,255,0.78)',
  inputBackground: '#243029',
  tabBarBackground: '#1A221E',
  statusBarStyle: 'light',
};

/** @deprecated Use useTheme().colors — kept for non-React modules */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export type ThemeTypography = {
  h1: { fontSize: number; fontWeight: '700'; color: string };
  h2: { fontSize: number; fontWeight: '600'; color: string };
  h3: { fontSize: number; fontWeight: '600'; color: string };
  body: { fontSize: number; fontWeight: '400'; color: string };
  bodySmall: { fontSize: number; fontWeight: '400'; color: string };
  caption: { fontSize: number; fontWeight: '400'; color: string };
  sectionLabel: { fontSize: number; fontWeight: '600'; color: string; letterSpacing: number };
};

export function buildTypography(palette: ThemeColors): ThemeTypography {
  return {
    h1: { fontSize: 28, fontWeight: '700', color: palette.text },
    h2: { fontSize: 22, fontWeight: '600', color: palette.text },
    h3: { fontSize: 18, fontWeight: '600', color: palette.text },
    body: { fontSize: 16, fontWeight: '400', color: palette.text },
    bodySmall: { fontSize: 14, fontWeight: '400', color: palette.textSecondary },
    caption: { fontSize: 12, fontWeight: '400', color: palette.textMuted },
    sectionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: palette.text,
      letterSpacing: -0.2,
    },
  };
}

export type ThemeShadows = {
  card: object;
  tabBar: object;
  button: object;
};

export function buildShadows(palette: ThemeColors, colorScheme: ColorScheme): ThemeShadows {
  const isDark = colorScheme === 'dark';
  const shadowBase = isDark ? palette.black : palette.primaryDark;
  return {
    card: Platform.select({
      web: {
        boxShadow: isDark
          ? '0 4px 24px rgba(0, 0, 0, 0.45)'
          : '0 4px 20px rgba(27, 67, 50, 0.06)',
      },
      default: {
        shadowColor: shadowBase,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.06,
        shadowRadius: 16,
        elevation: isDark ? 4 : 2,
      },
    })!,
    tabBar: Platform.select({
      web: {
        boxShadow: isDark
          ? '0 -2px 16px rgba(0, 0, 0, 0.5)'
          : '0 -2px 12px rgba(27, 67, 50, 0.06)',
      },
      default: {
        shadowColor: shadowBase,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: isDark ? 0.4 : 0.06,
        shadowRadius: 8,
        elevation: 8,
      },
    })!,
    button: Platform.select({
      web: {
        boxShadow: isDark
          ? '0 2px 10px rgba(0, 0, 0, 0.4)'
          : '0 2px 8px rgba(45, 106, 79, 0.25)',
      },
      default: {
        shadowColor: palette.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.2,
        shadowRadius: 4,
        elevation: 2,
      },
    })!,
  };
}

export type AppTheme = {
  colorScheme: ColorScheme;
  colors: ThemeColors;
  typography: ThemeTypography;
  shadows: ThemeShadows;
};

export function buildTheme(colorScheme: ColorScheme): AppTheme {
  const colors = colorScheme === 'dark' ? darkColors : lightColors;
  return {
    colorScheme,
    colors,
    typography: buildTypography(colors),
    shadows: buildShadows(colors, colorScheme),
  };
}

/** @deprecated Use useTheme().typography */
export const typography = buildTypography(lightColors);

/** @deprecated Use useTheme().shadows */
export const shadows = buildShadows(lightColors, 'light');

export const touchTarget = 44;
export const logoSize = 200;
