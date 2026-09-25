import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, PackageCheck, Wallet, ShoppingBag } from 'lucide-react-native';

import { DashboardScreen } from '../screens/DashboardScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { StoreScreen } from '../screens/StoreScreen';
import { SCREEN_WIDTH } from '../utils/layout';
import { useTheme, makeStyles } from '../theme';

const isTablet = SCREEN_WIDTH >= 768;
const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const baseHeight = isTablet ? 80 : 70;
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: [
            styles.tabBar,
            {
              height: baseHeight + insets.bottom,
              paddingBottom: 10 + insets.bottom,
            },
          ],
          tabBarIcon: ({ focused }) => {
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
                  <IconComp size={20} color={focused ? colors.primary : colors.textFaint} strokeWidth={focused ? 2.5 : 1.8} />
                </View>
                <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textFaint }]} numberOfLines={1}>
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

const useStyles = makeStyles((c) => ({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: c.surface,
    borderTopWidth: 1,
    borderTopColor: c.border,
    elevation: 10,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    minWidth: 60,
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
    backgroundColor: c.primarySoft,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
}));
