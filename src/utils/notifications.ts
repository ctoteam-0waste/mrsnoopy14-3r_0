import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (_) {}

// Push tokens from Expo Go are sandbox tokens the backend rejects — skip entirely
const isExpoGo = Constants?.appOwnership === 'expo';

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;
  if (isExpoGo) return null; // Expo Go tokens are rejected by backend — needs APK build

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return tokenData.data;
}

export async function sendTokenToBackend(fcmToken: string): Promise<void> {
  try {
    await api.post('/api/v1/notifications/device-token', {
      token: fcmToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch (e) {
    console.warn('Failed to register push token with backend:', e);
  }
}

export async function removeTokenFromBackend(): Promise<void> {
  if (!Notifications) return;
  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    if (tokenData?.data) {
      await api.delete('/api/v1/notifications/device-token', {
        data: { token: tokenData.data },
      });
    }
  } catch (e) {
    console.warn('Failed to remove push token:', e);
  }
}

export function addPushTokenRefreshListener(callback: (token: string) => void) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addPushTokenListener(({ data }: { data: string }) => {
    callback(data);
  });
}

export function addNotificationResponseListener(callback: (data: any) => void) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response: any) => {
    callback(response.notification.request.content.data);
  });
}

export async function getLastNotificationResponse(): Promise<any | null> {
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data || null;
}
