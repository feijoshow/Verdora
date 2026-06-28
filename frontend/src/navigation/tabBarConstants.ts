/** Floating pill tab bar layout — keep in sync with FarmerTabBar styles */
export const TAB_BAR_PILL_HEIGHT = 60;
export const TAB_BAR_FLOAT_MARGIN = 10;
export const TAB_BAR_HORIZONTAL_MARGIN = 16;

/** Vertical space above the home indicator (pill + float gap, no safe area). */
export const TAB_BAR_CONTENT_HEIGHT = TAB_BAR_PILL_HEIGHT + TAB_BAR_FLOAT_MARGIN;

export function tabBarBottomInset(safeAreaBottom: number): number {
  return TAB_BAR_CONTENT_HEIGHT + safeAreaBottom;
}
