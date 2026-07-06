import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Home, PackageCheck, Wallet, ShoppingBag, Bell, Leaf, User } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { NotificationPanel } from '../components/shared/NotificationPanel';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { navigationRef } from './navRef';

const Tab = createBottomTabNavigator();

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
        <View style={s.navLeft}>
          <View style={s.navLogo}><Leaf size={18} color="white" /></View>
          <Text style={s.navBrand}>KarmaCoins XP</Text>
        </View>

        <View style={s.navTabs}>
          {NAV_ITEMS.map((item, index) => {
            const active = state.index === index;
            const { Icon } = item;
            return (
              <TouchableOpacity
                key={item.name}
                style={[s.navTab, active && s.navTabActive]}
                onPress={() => navigation.navigate(item.name)}
                activeOpacity={0.8}
              >
                <Icon size={18} color={active ? '#4ade80' : 'rgba(255,255,255,0.45)'} strokeWidth={active ? 2.5 : 1.8} />
                <Text style={[s.navTabText, active && s.navTabTextActive]}>{item.label}</Text>
                {active && <View style={s.navTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.navRight}>
          <TouchableOpacity style={s.navIconBtn} onPress={() => setShowNotifications(true)}>
            <Bell size={18} color="rgba(255,255,255,0.6)" />
            {unreadCount > 0 && (
              <View style={s.bellBadge}>
                <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={s.navAvatar} onPress={() => navigationRef.current?.navigate('Profile')}>
            <User size={16} color="#052e16" />
          </TouchableOpacity>
        </View>
      </View>
      {notifPanel}
    </View>
  );
}

export function TabNavigator() {
  const { width } = useWindowDimensions();
  return (
    <View style={[s.root, width < 768 && { paddingBottom: 64 }]}>
      <Tab.Navigator
        tabBar={(props) => <TopNavbar {...props} />}
        screenOptions={{ headerShown: false }}
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
  bottomBar: { flexDirection: 'row', backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', height: 64 },
  bottomTab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  bottomTabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  bottomTabTextActive: { color: '#4ade80' },
  bellBadgeMobile: { position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },

  // Desktop top navbar
  navOuter: { backgroundColor: '#0f172a', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 12, zIndex: 100 },
  nav: { maxWidth: 1200, width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32, height: 64 },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLogo: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center' },
  navBrand: { color: 'white', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  navTabs: { flexDirection: 'row', gap: 2, height: 64 },
  navTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, position: 'relative', height: 64 },
  navTabActive: {},
  navTabText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  navTabTextActive: { color: '#4ade80', fontWeight: '800' },
  navTabIndicator: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#4ade80', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  navIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', position: 'relative' },
  navAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#16a34a', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#4ade80' },
  bellBadge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#0f172a' },
  bellBadgeText: { color: 'white', fontSize: 9, fontWeight: '900' },
});
