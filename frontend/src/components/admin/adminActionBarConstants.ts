/** Floating admin action bar — keep in sync with AdminFloatingActionBar styles */
export const ADMIN_ACTION_BAR_HEIGHT = 56;
export const ADMIN_ACTION_BAR_FLOAT_MARGIN = 10;
export const ADMIN_ACTION_BAR_HORIZONTAL_MARGIN = 16;

export const ADMIN_ACTION_BAR_CONTENT_HEIGHT =
  ADMIN_ACTION_BAR_HEIGHT + ADMIN_ACTION_BAR_FLOAT_MARGIN;

export function adminActionBarBottomInset(safeAreaBottom: number): number {
  return ADMIN_ACTION_BAR_CONTENT_HEIGHT + safeAreaBottom;
}
