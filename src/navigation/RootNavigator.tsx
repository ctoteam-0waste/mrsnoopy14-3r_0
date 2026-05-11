import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
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
