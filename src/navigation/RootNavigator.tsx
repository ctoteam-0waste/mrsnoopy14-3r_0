import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addNotificationResponseListener, getLastNotificationResponse } from '../utils/notifications';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SchedulePickupScreen } from '../screens/SchedulePickupScreen';
import { KnowledgeHubScreen } from '../screens/KnowledgeHubScreen';
import { ArticleDetailScreen } from '../screens/ArticleDetailScreen';
import { QuizScreen } from '../screens/QuizScreen';
import { ReferralScreen } from '../screens/ReferralScreen';
import { OrderTrackingScreen } from '../screens/OrderTrackingScreen';
import { BookingDetailsScreen } from '../screens/BookingDetailsScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { RedeemScreen } from '../screens/RedeemScreen';
import { RedeemHistoryScreen } from '../screens/RedeemHistoryScreen';
import { AboutUsScreen } from '../screens/AboutUsScreen';
import { TabNavigator } from './TabNavigator';
import { navigationRef } from './navRef';

const Stack = createNativeStackNavigator();

// GA4 tracking (web only) — gtag.js is loaded in public/index.html with
// send_page_view disabled, so every screen change (not just the first load) is
// reported here as its own page_view, using the React Navigation route name.
function trackPageView(routeName: string | undefined) {
  if (Platform.OS !== 'web' || !routeName || typeof window === 'undefined') return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', 'page_view', {
    page_title: routeName,
    page_path: `/${routeName}`,
    page_location: window.location.href,
  });
}

function AuthLoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}

export function RootNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const navRef = navigationRef;
  const routeNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const isValid = !!token && token !== 'undefined' && token !== 'null';
        setIsLoggedIn(isValid);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoggedIn(false);
      }
    };
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const handleNotificationData = (data: any) => {
      if (!data?.bookingId || !navRef.current) return;
      navRef.current.navigate('BookingDetails', { booking: { _id: data.bookingId } });
    };

    getLastNotificationResponse().then(data => {
      if (data) handleNotificationData(data);
    });

    const sub = addNotificationResponseListener(handleNotificationData);
    return () => sub.remove();
  }, []);

  // Web-only URL routing for the public pages — gives them real, shareable, crawlable
  // URLs. Deliberately excludes the `karmacoin://` scheme so the existing manual
  // referral-code deep-link handling in App.tsx (native) is unaffected. The root path
  // ('') must map to whichever screen `initialRouteName` would otherwise pick, or a
  // logged-in user visiting '/' would get bounced to the Splash marketing screen.
  const linking = useMemo(() => ({
    prefixes: Platform.OS === 'web' && typeof window !== 'undefined' ? [window.location.origin] : [],
    config: {
      screens: isLoggedIn
        ? { App: '', Login: 'login', Legal: 'legal/:type' }
        : { Splash: '', Login: 'login', Legal: 'legal/:type' },
    },
  }), [isLoggedIn]);

  if (isLoggedIn === null) {
    return <AuthLoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navRef}
      linking={linking}
      onReady={() => {
        routeNameRef.current = navRef.current?.getCurrentRoute()?.name;
        trackPageView(routeNameRef.current);
      }}
      onStateChange={() => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navRef.current?.getCurrentRoute()?.name;
        if (currentRouteName && currentRouteName !== previousRouteName) {
          trackPageView(currentRouteName);
        }
        routeNameRef.current = currentRouteName;
      }}
    >
      <Stack.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isLoggedIn ? 'App' : 'Splash'}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="App" component={TabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="SchedulePickup" component={SchedulePickupScreen} />
        <Stack.Screen name="KnowledgeHub" component={KnowledgeHubScreen} />
        <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="Referral" component={ReferralScreen} />
        <Stack.Screen name="OrderTracking" component={OrderTrackingScreen} />
        <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="Redeem" component={RedeemScreen} />
        <Stack.Screen name="RedeemHistory" component={RedeemHistoryScreen} />
        <Stack.Screen name="AboutUs" component={AboutUsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#064e3b',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
