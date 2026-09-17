import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserSocketProvider } from './src/context/UserSocketContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ResponsiveContainer } from './src/components/shared/ResponsiveContainer';
import { AlertHost } from './src/components/shared/AlertHost';
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
    // Web client from the Firebase project (152765471990 / karmacoin-e6fa7) — the same
    // project as google-services.json + the Android OAuth client (package + SHA-1). The
    // Android idToken audience is this Web client, which the backend must verify against.
    webClientId: '152765471990-4g23up0gau0bclvkm3gk67fa1mpbe5r8.apps.googleusercontent.com',
    // NOTE: iosClientId still points at the old project (1078804135433). iOS Sign-In needs
    // an iOS OAuth client from project 152765471990 (and the matching iosUrlScheme in
    // app.json) before it works — Android/APK builds ignore this field.
    iosClientId: '1078804135433-uflagcil41uhmlgd3tf1g80snh0kj3b2.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  });
} catch (_) {}

// Extract a referral code from a deep link URL.
// Path style:  karmacoin://r/CODE,  https://karmaverse.earth/r/CODE
// Query style: https://karmaverse.earth/login?ref=CODE  (what the share sheet builds)
// Codes look like NAME-KARMA-XXXX — letters, digits and hyphens, not just KARMA-*.
function extractReferralCode(url: string): string | null {
  if (!url) return null;
  const q = url.match(/[?&]ref=([A-Za-z0-9-]+)/);
  if (q) return q[1].toUpperCase();
  const p = url.match(/\/r\/([A-Za-z0-9-]+)/);
  if (p) return p[1].toUpperCase();
  return null;
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
          <AlertHost />
        </UserSocketProvider>
      </NotificationProvider>
    </SafeAreaProvider>
  );
}
