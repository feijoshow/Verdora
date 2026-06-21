/**
 * Verdora design tokens — agricultural green/earth palette.
 */
import { Platform } from 'react-native';
export const colors = {
  primary: '#2D6A4F',
  primaryDark: '#1B4332',
  primaryLight: '#52B788',
  secondary: '#D4A373',
  secondaryDark: '#BC6C25',
  background: '#F8F9F5',
  surface: '#FFFFFF',
  surfaceAlt: '#E9F5EC',
  text: '#1B1B1B',
  textSecondary: '#5C5C5C',
  textMuted: '#8A8A8A',
  border: '#D8E2DC',
  error: '#C1121F',
  warning: '#E9C46A',
  success: '#40916C',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(27, 67, 50, 0.6)',
  scrimLight: 'rgba(0, 0, 0, 0.15)',
  errorSurface: '#FDE8E8',
  warningSurface: '#FFF8E7',
  /** Soft green wash for hero bands and chips */
  primarySoft: '#E8F5EE',
  /** User chat bubble accent */
  primaryMuted: '#40916C',
};

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

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 22, fontWeight: '600' as const, color: colors.text },
  h3: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 16, fontWeight: '400' as const, color: colors.text },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, color: colors.textMuted },
  /** Uppercase section labels (Hub, Calendar, etc.) */
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
};

export const shadows = {
  card: Platform.select({
    web: {
      boxShadow: '0 2px 12px rgba(27, 67, 50, 0.08)',
    },
    default: {
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 10,
      elevation: 3,
    },
  })!,
  tabBar: Platform.select({
    web: { boxShadow: '0 -2px 12px rgba(27, 67, 50, 0.06)' },
    default: {
      shadowColor: colors.primaryDark,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 8,
    },
  })!,
  button: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(45, 106, 79, 0.25)' },
    default: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
  })!,
};

/** Minimum tappable control size (send buttons, icon buttons). */
export const touchTarget = 44;

/** Branded splash logo dimensions. */
export const logoSize = 200;
