import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Paints the status-bar area behind a screen's colored header. Sized from the real
// top inset (Dynamic Island iPhones are ~62pt, so a fixed 60 left a white hairline)
// plus a small overlap that stays hidden behind the header — never tall enough to
// bleed past its rounded bottom corners.
export function StatusBarFiller({ color }: { color: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 16, backgroundColor: color }}
    />
  );
}
