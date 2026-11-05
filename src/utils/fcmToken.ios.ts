import {
  getMessaging,
  getToken,
  registerDeviceForRemoteMessages,
  setAPNSToken,
} from '@react-native-firebase/messaging';

// The backend sends every push through FCM, so iOS must register the FCM token
// Firebase derives from the APNs token — the raw APNs token alone is rejected.
// The APNs token is handed over explicitly so getToken never races its arrival.
export async function getFcmToken(apnsToken: string): Promise<string | null> {
  try {
    const messaging = getMessaging();
    await setAPNSToken(messaging, apnsToken);
    await registerDeviceForRemoteMessages(messaging);
    return await getToken(messaging);
  } catch (e) {
    console.warn('Failed to get FCM token:', e);
    return null;
  }
}
