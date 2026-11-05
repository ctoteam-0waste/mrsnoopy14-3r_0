import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { AppTopBar, AppBottomBar, NAV_HEIGHT } from '../components/shared/WebAppNav';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

function TopNavbar({ state, navigation }: any) {
  const { width } = useWindowDimensions();
  const activeName = state.routes[state.index]?.name;
  const onNavigate = (name: string) => navigation.navigate(name);
  return width < 768
    ? <AppBottomBar activeName={activeName} onNavigate={onNavigate} />
    : <AppTopBar activeName={activeName} onNavigate={onNavigate} overlay />;
}

export function TabNavigator() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return (
    <View style={[s.root, isMobile && { paddingBottom: NAV_HEIGHT }]}>
      <Tab.Navigator
        tabBar={(props) => <TopNavbar {...props} />}
        screenOptions={{ headerShown: false }}
        // bottom-tabs v6 has no `tabBarPosition`, so on desktop the navbar is
        // pinned to the top (see `overlay` in AppTopBar) and the scenes are padded
        // down by its height so content starts below it instead of underneath.
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
});
