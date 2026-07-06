import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
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
import { TabNavigator } from './TabNavigator';
import { navigationRef } from './navRef';

const Stack = createStackNavigator();

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

  if (isLoggedIn === null) {
    return <AuthLoadingScreen />;
  }

  return (
    <NavigationContainer ref={navRef}>
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
