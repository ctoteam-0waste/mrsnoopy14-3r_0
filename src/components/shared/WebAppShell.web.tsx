import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { AppTopBar, AppBottomBar, NAV_HEIGHT } from './WebAppNav';
import { navigationRef } from '../../navigation/navRef';

const goToTab = (name: string) => navigationRef.current?.navigate('App', { screen: name });

// Stack screens opened from the app (Schedule pickup, Booking details, Live
// tracking) sit outside the tab navigator, so on web they lost the site navbar.
// This wraps them in the same top bar (desktop) / bottom bar (mobile). The
// screen keeps its slot in the tree across the breakpoint, so resizing never
// remounts it (and never drops a half-filled form).
export function withWebAppShell<P>(Screen: React.ComponentType<P>, activeTab?: string): React.ComponentType<P> {
  return function WebAppShell(props: P) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    return (
      <View style={{ flex: 1, paddingBottom: isMobile ? NAV_HEIGHT : 0 }}>
        {!isMobile && <AppTopBar activeName={activeTab} onNavigate={goToTab} />}
        <View style={{ flex: 1 }}>
          <Screen {...(props as any)} />
        </View>
        {isMobile && <AppBottomBar activeName={activeTab} onNavigate={goToTab} />}
      </View>
    );
  };
}
