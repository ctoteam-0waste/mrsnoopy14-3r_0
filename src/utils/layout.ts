import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Native bottom tab bar height, before the safe-area inset is added.
export const TAB_BAR_BASE_HEIGHT = SCREEN_WIDTH >= 768 ? 80 : 70;
const TAB_BAR_BOTTOM_PADDING = 10;

// The bottom padding only matters on devices without a home indicator; where there
// is one, its inset already leaves that room, so it replaces the padding instead of
// stacking on top of it (which left a tall empty band under the labels on iPhone).
export function tabBarBottomPadding(bottomInset: number) {
  return Math.max(bottomInset, TAB_BAR_BOTTOM_PADDING);
}

export function tabBarHeight(bottomInset: number) {
  return TAB_BAR_BASE_HEIGHT - TAB_BAR_BOTTOM_PADDING + tabBarBottomPadding(bottomInset);
}
