import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { UserSocketProvider } from './src/context/UserSocketContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ResponsiveContainer } from './src/components/shared/ResponsiveContainer';
import { AlertHost } from './src/components/shared/AlertHost';
import { RootErrorBoundary } from './src/components/shared/RootErrorBoundary';
import {
  registerForPushNotifications,
  sendTokenToBackend,
  addPushTokenRefreshListener,
  setupAndroidChannels,
  setupNotificationCategories,
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
    // iOS client from the same project (CLIENT_ID in GoogleService-Info.plist); its reversed
    // form is the iosUrlScheme in app.json. Android/APK builds ignore this field.
    iosClientId: '152765471990-c56hvo7q6pkqgaje639q9bupvoq0sa55.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
  });
} catch (_) {}

export default function App() {
  useEffect(() => {
    // Set up Android notification channels and the action-button categories once,
    // up front, so transactional pushes land on the right channel and (where the OS
    // supports it) show their action buttons. Fire-and-forget — both are idempotent.
    setupAndroidChannels();
    setupNotificationCategories();

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
      pushSub.remove();
    };
  }, []);

  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <NotificationProvider>
            <UserSocketProvider>
              <RootNavigator />
              <AlertHost />
            </UserSocketProvider>
          </NotificationProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}
