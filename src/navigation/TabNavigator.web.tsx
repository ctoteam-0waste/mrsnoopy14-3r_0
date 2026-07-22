import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, useWindowDimensions, Image } from 'react-native';
import { Home, PackageCheck, Wallet, ShoppingBag, Bell, User } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { NotificationPanel } from '../components/shared/NotificationPanel';
import { LinearGradient } from 'expo-linear-gradient';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { navigationRef } from './navRef';

const Tab = createBottomTabNavigator();

const NAV_HEIGHT = 64;

// react-native-web passes these straight through to CSS, so hover changes ease
// in instead of snapping. Not part of RN's ViewStyle type, hence the cast.
const HOVER_TRANSITION = {
  transitionDuration: '220ms',
  transitionProperty: 'opacity, transform, background-color',
  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as any;

const NAV_ITEMS = [
  { name: 'Dashboard', label: 'Home', Icon: Home },
  { name: 'Orders', label: 'Orders', Icon: PackageCheck },
  { name: 'Wallet', label: 'Wallet', Icon: Wallet },
  { name: 'Store', label: 'Store', Icon: ShoppingBag },
];

function TopNavbar({ state, navigation }: any) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { width } = useWindowDimensions();
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const isMobile = width < 768;

  const notifPanel = (
    <NotificationPanel
      visible={showNotifications}
      onClose={() => setShowNotifications(false)}
      notifications={notifications}
      unreadCount={unreadCount}
      onMarkRead={markRead}
      onMarkAllRead={markAllRead}
      onClearAll={clearAll}
    />
  );

  if (isMobile) {
    return (
      <>
        <View style={s.bottomBar}>
          {NAV_ITEMS.map((item, index) => {
            const active = state.index === index;
            const { Icon } = item;
            return (
              <TouchableOpacity key={item.name} style={s.bottomTab} onPress={() => navigation.navigate(item.name)} activeOpacity={0.7}>
                <Icon size={22} color={active ? '#4ade80' : 'rgba(255,255,255,0.4)'} strokeWidth={active ? 2.5 : 1.8} />
                <Text style={[s.bottomTabText, active && s.bottomTabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={s.bottomTab} onPress={() => setShowNotifications(true)} activeOpacity={0.7}>
            <View style={{ position: 'relative' }}>
              <Bell size={22} color="rgba(255,255,255,0.4)" />
              {unreadCount > 0 && (
                <View style={s.bellBadgeMobile}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                </View>
              )}
            </View>
            <Text style={s.bottomTabText}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.bottomTab} onPress={() => navigationRef.current?.navigate('Profile')} activeOpacity={0.7}>
            <User size={22} color="rgba(255,255,255,0.4)" />
            <Text style={s.bottomTabText}>Profile</Text>
          </TouchableOpacity>
        </View>
        {notifPanel}
      </>
    );
  }

  return (
    <View style={s.navOuter}>
      <View style={s.nav}>
        <Pressable
          style={({ hovered }: any) => [s.navLeft, HOVER_TRANSITION, hovered && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Dashboard')}
          accessibilityRole="link"
          accessibilityLabel="KarmaVerse home"
        >
          {/* logo-nav.png is the padding-trimmed variant (aspect ~2.12:1) — logo.png
              has ~35% transparent padding baked in, which shrank the mark to ~31px. */}
          <Image source={require('../../assets/logo-nav.png')} style={{ height: 44, width: 94, resizeMode: 'contain' }} />
        </Pressable>

        <View style={s.navTabs}>
          {NAV_ITEMS.map((item, index) => {
            const active = state.index === index;
            const { Icon } = item;
            return (
              <Pressable key={item.name} style={s.navTab} onPress={() => navigation.navigate(item.name)}>
                {({ hovered }: any) => {
                  const lit = hovered && !active;
                  return (
                    <>
                      {/* Glow rising from the underline. Always mounted and faded
                          via opacity so it can transition instead of popping in. */}
                      <View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, HOVER_TRANSITION, { opacity: lit ? 1 : 0 }]}
                      >
                        <LinearGradient
                          colors={['transparent', 'rgba(74,222,128,0.16)']}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>

                      <Icon
                        size={18}
                        color={active ? '#4ade80' : lit ? '#86efac' : 'rgba(255,255,255,0.45)'}
                        strokeWidth={active ? 2.5 : 1.8}
                      />
                      <Text style={[s.navTabText, lit && s.navTabTextHover, active && s.navTabTextActive]}>
                        {item.label}
                      </Text>

                      {active ? (
                        <View style={s.navTabIndicator} />
                      ) : (
                        // Grows out from the centre on hover (default transform origin).
                        <View
                          pointerEvents="none"
                          style={[s.navTabIndicatorHover, HOVER_TRANSITION, { transform: [{ scaleX: lit ? 1 : 0 }] }]}
                        />
                      )}
                    </>
                  );
                }}
              </Pressable>
            );
          })}
        </View>

        <View style={s.navRight}>
          <Pressable
            style={({ hovered }: any) => [s.navIconBtn, HOVER_TRANSITION, hovered && s.navIconBtnHover]}
            onPress={() => setShowNotifications(true)}
          >
            {({ hovered }: any) => (
              <>
                <Bell size={18} color={hovered ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)'} />
                {unreadCount > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
                  </View>
                )}
              </>
            )}
          </Pressable>
          <Pressable
            style={({ hovered }: any) => [s.navAvatar, HOVER_TRANSITION, hovered && s.navAvatarHover]}
            onPress={() => navigationRef.current?.navigate('Profile')}
          >
            <User size={16} color="#052e16" />
          </Pressable>
        </View>
      </View>
      {notifPanel}
    </View>
  );
}

export function TabNavigator() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <View style={[s.root, isMobile && { paddingBottom: 64 }]}>
      <Tab.Navigator
        tabBar={(props) => <TopNavbar {...props} />}
        screenOptions={{ headerShown: false }}
        // bottom-tabs v6 has no `tabBarPosition`, so on desktop the navbar is
        // pinned to the top (see `navOuter`) and the scenes are padded down by
        // its height so content starts below it instead of underneath.
        sceneContainerStyle={isMobile ? undefined : { paddingTop: NAV_HEIGHT }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Orders" component={OrdersScreen} />
        <Tab.Screen name="Wallet" component={WalletScreen} />
        <Tab.Screen name="Store" component={StoreScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },

  // Mobile bottom bar
  bottomBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', height: NAV_HEIGHT },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  bottomTabTextActive: { color: '#4ade80' },
  bellBadgeMobile: { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },

  // Desktop top navbar
  // Pinned to the very top (Flipkart-style). The tab bar is rendered after the
  // scenes in the tree, so it needs absolute positioning to sit above them.
  navOuter: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#0f172a', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12, zIndex: 100 },
  nav: { maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, height: NAV_HEIGHT },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  navBrand: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  navTabs: { flexDirection: 'row', gap: 2, height: NAV_HEIGHT },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, position: 'relative', height: NAV_HEIGHT, overflow: 'hidden' },
  navTabActive: {},
  navTabText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  navTabTextHover: { color: '#86efac' },
  navTabTextActive: { color: '#4ade80', fontWeight: '800' },
  navTabIndicator: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4ade80',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    shadowColor: '#4ade80', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  navTabIndicatorHover: {
    position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4ade80',
    borderTopLeftRadius: 3, borderTopRightRadius: 3,
    shadowColor: '#4ade80', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  navIconBtnHover: {
    backgroundColor: 'rgba(74,222,128,0.16)', borderColor: 'rgba(74,222,128,0.45)',
    transform: [{ translateY: -2 }],
    shadowColor: '#4ade80', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  navAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4ade80' },
  navAvatarHover: {
    backgroundColor: '#4ade80',
    transform: [{ translateY: -2 }, { scale: 1.06 }],
    shadowColor: '#4ade80', shadowOpacity: 0.7, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#0f172a' },
  bellBadgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
});
