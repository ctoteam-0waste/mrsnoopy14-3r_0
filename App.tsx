import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserSocketProvider } from './src/context/UserSocketContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ResponsiveContainer } from './src/components/shared/ResponsiveContainer';
import {
  registerForPushNotifications,
  sendTokenToBackend,
  addPushTokenRefreshListener,
} from './src/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google Sign-In requires a native build — not available in Expo Go
try {
  const { GoogleSignin } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({
    webClientId: '1078804135433-masdouemo4cvdhe80fi6v5nvkv6p76vs.apps.googleusercontent.com',
    iosClientId: '1078804135433-uflagcil41uhmlgd3tf1g80snh0kj3b2.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  });
} catch (_) {}

export default function App() {
  useEffect(() => {
    // Register push token for already-logged-in users on app start
    AsyncStorage.getItem('userToken').then(token => {
      if (!token) return;
      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});
    });

    // Listen for FCM token refresh and re-register
    const sub = addPushTokenRefreshListener((newToken) => {
      sendTokenToBackend(newToken);
    });

    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NotificationProvider>
          <UserSocketProvider>
            <RootNavigator />
          </UserSocketProvider>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
