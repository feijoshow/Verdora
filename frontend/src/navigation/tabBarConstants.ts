import { Platform } from 'react-native';

/** Floating pill tab bar layout — keep in sync with FarmerTabBar styles */
export const TAB_BAR_PILL_HEIGHT = 60;
export const TAB_BAR_FLOAT_MARGIN = 10;
export const TAB_BAR_HORIZONTAL_MARGIN = 16;

/** Vertical space above the home indicator (pill + float gap, no safe area). */
export const TAB_BAR_CONTENT_HEIGHT = TAB_BAR_PILL_HEIGHT + TAB_BAR_FLOAT_MARGIN;

/** Matches FarmerTabBar `bottomPad` logic. */
export function tabBarSafeBottomInset(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, Platform.OS === 'web' ? 12 : 8);
}

/** Total height reserved at the bottom so content clears the floating tab bar. */
export function tabBarOverlayHeight(safeAreaBottom: number): number {
  const bottomPad = tabBarSafeBottomInset(safeAreaBottom);
  return TAB_BAR_PILL_HEIGHT + TAB_BAR_FLOAT_MARGIN + bottomPad;
}

/** @deprecated Use tabBarOverlayHeight */
export function tabBarBottomInset(safeAreaBottom: number): number {
  return tabBarOverlayHeight(safeAreaBottom);
}
