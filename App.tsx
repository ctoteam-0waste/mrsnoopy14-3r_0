import React, { useEffect } from 'react';
import { Linking } from 'react-native';
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

// Extract referral code from deep link URL
// Handles: karmacoin://r/KARMA-XXXXXX  and  https://karmacoin.app/r/KARMA-XXXXXX
function extractReferralCode(url: string): string | null {
  const match = url.match(/\/r\/(KARMA-[A-Z0-9]+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default function App() {
  useEffect(() => {
    // Deep link — cold start (app was closed)
    Linking.getInitialURL().then(url => {
      if (!url) return;
      const code = extractReferralCode(url);
      if (code) AsyncStorage.setItem('pendingReferralCode', code);
    });

    // Deep link — app already open in background
    const linkSub = Linking.addEventListener('url', ({ url }) => {
      const code = extractReferralCode(url);
      if (code) AsyncStorage.setItem('pendingReferralCode', code);
    });

    // Register push token for already-logged-in users on app start
    AsyncStorage.getItem('userToken').then(token => {
      if (!token) return;
      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});
    });

    // Listen for FCM token refresh and re-register
    const pushSub = addPushTokenRefreshListener((newToken) => {
      sendTokenToBackend(newToken);
    });

    return () => {
      linkSub.remove();
      pushSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <NotificationProvider>
        <UserSocketProvider>
          <RootNavigator />
        </UserSocketProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
