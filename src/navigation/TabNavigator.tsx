import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Home, PackageCheck, Wallet, ShoppingBag } from 'lucide-react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoreScreen } from '../screens/StoreScreen';

// Empty placeholders for incomplete screens
const PlaceholderScreen = () => <View style={{ flex: 1, backgroundColor: '#f0fdf6' }} />;

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color, size }) => {
          let IconComp = Home;
          let label = '';
          
          if (route.name === 'Dashboard') {
            IconComp = Home;
            label = 'Home';
          } else if (route.name === 'Orders') {
            IconComp = PackageCheck;
            label = 'Orders';
          } else if (route.name === 'Wallet') {
            IconComp = Wallet;
            label = 'Wallet';
          } else if (route.name === 'Store') {
            IconComp = ShoppingBag;
            label = 'Store';
          }

          return (
            <View style={styles.tabItem}>
              <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                <IconComp size={20} color={focused ? '#16a34a' : '#9ca3af'} strokeWidth={focused ? 2.5 : 1.8} />
              </View>
              <Text style={[styles.tabLabel, { color: focused ? '#16a34a' : '#9ca3af' }]}>
                {label}
              </Text>
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Orders" component={OrdersScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Store" component={StoreScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    paddingBottom: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconContainer: {
    width: 40,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  iconContainerActive: {
    backgroundColor: 'rgba(22,163,74,0.12)',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
