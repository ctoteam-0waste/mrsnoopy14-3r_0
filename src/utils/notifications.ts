import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { getFcmToken } from './fcmToken';

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
} catch (_) {}

// expo-notifications imports fine on web, but its native methods
// (getLastNotificationResponseAsync, addNotificationResponseReceivedListener, …)
// throw "not available on web". Null it out so every `if (!Notifications)` guard
// below short-circuits and we never call an unsupported API in the browser.
if (Platform.OS === 'web') {
  Notifications = null;
}

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

// Android notification channels. Transactional pushes carry a `channel_id` so the
// OS groups/prioritises them correctly. Safe to call repeatedly (idempotent) and
// independent of permission, so it runs once on app start. 'default' is kept for
// backward compatibility with any backend push that doesn't set a channel yet.
export async function setupAndroidChannels(): Promise<void> {
  if (!Notifications || Platform.OS !== 'android') return;
  const base = { vibrationPattern: [0, 250, 250, 250], lightColor: '#16a34a' };
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General', importance: Notifications.AndroidImportance.MAX, ...base,
    });
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Pickup updates', importance: Notifications.AndroidImportance.MAX, ...base,
    });
    await Notifications.setNotificationChannelAsync('rewards', {
      name: 'Coins & rewards', importance: Notifications.AndroidImportance.HIGH, ...base,
    });
    // Marketing / engagement pushes — a separate, quieter channel so a user can mute
    // promos in system settings without losing transactional pickup updates.
    await Notifications.setNotificationChannelAsync('promotions', {
      name: 'Offers & reminders', importance: Notifications.AndroidImportance.DEFAULT, ...base,
    });
  } catch (_) { /* channel setup is best-effort */ }
}

// Action-button categories. The backend references these by `categoryId` in the
// FCM data. The tap-to-deep-link routing (RootNavigator) works regardless; whether
// the buttons actually render on a remote notification is OEM/OS dependent and must
// be verified on a device build (see the notifications plan). Safe to call often.
export async function setupNotificationCategories(): Promise<void> {
  if (!Notifications) return;
  const fg = { opensAppToForeground: true };
  try {
    await Notifications.setNotificationCategoryAsync('booking_progress', [
      { identifier: 'track', buttonTitle: 'Track pickup', options: fg },
    ]);
    await Notifications.setNotificationCategoryAsync('booking_completed', [
      { identifier: 'rate', buttonTitle: 'Rate agent', options: fg },
      { identifier: 'view', buttonTitle: 'View booking', options: fg },
    ]);
    await Notifications.setNotificationCategoryAsync('booking_cancelled', [
      { identifier: 'orders', buttonTitle: 'View orders', options: fg },
    ]);
    // Non-transactional (marketing / engagement) nudges. The deep-link target also
    // rides in data.screen, so a plain tap still routes even without these buttons.
    await Notifications.setNotificationCategoryAsync('promo_quiz', [
      { identifier: 'open_quiz', buttonTitle: 'Play quiz', options: fg },
    ]);
    await Notifications.setNotificationCategoryAsync('promo_redeem', [
      { identifier: 'open_redeem', buttonTitle: 'Redeem now', options: fg },
    ]);
    await Notifications.setNotificationCategoryAsync('promo_pickup', [
      { identifier: 'open_pickup', buttonTitle: 'Schedule pickup', options: fg },
    ]);
    await Notifications.setNotificationCategoryAsync('promo_referral', [
      { identifier: 'open_referral', buttonTitle: 'Invite friends', options: fg },
    ]);
  } catch (_) { /* categories are best-effort */ }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice) return null;
  if (Platform.OS === 'web') return null;
  if (isExpoGo) return null; // Expo Go tokens are rejected by backend — needs APK build

  await setupAndroidChannels();

  // Only register a token when permission is ALREADY granted — we never fire the OS
  // prompt from here. Asking is done explicitly (the in-app primer / Profile row via
  // enablePush → requestPushPermission), so the user sees our branded ask first and
  // the one-shot iOS dialog is never spent silently on login.
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;

  const tokenData = await Notifications.getDevicePushTokenAsync();
  return getFcmToken(tokenData.data);
}

// Whether OS push notifications are usable at all on this build (native, not web,
// not Expo Go where tokens are rejected). The re-enable UI only makes sense here.
export function isPushSupported(): boolean {
  return !!Notifications && !!Device?.isDevice && Platform.OS !== 'web' && !isExpoGo;
}

export interface PushPermissionState {
  granted: boolean;
  canAskAgain: boolean; // false → OS won't prompt again; must deep-link to Settings
  undetermined: boolean; // never asked yet
}

// Read the current OS permission without prompting. Safe on web/Expo Go (returns not-granted).
export async function getPushPermission(): Promise<PushPermissionState> {
  if (!Notifications || Platform.OS === 'web') {
    return { granted: false, canAskAgain: false, undetermined: false };
  }
  try {
    const res = await Notifications.getPermissionsAsync();
    const granted = res.status === 'granted' || res.granted === true;
    return {
      granted,
      canAskAgain: res.canAskAgain !== false,
      undetermined: res.status === 'undetermined',
    };
  } catch {
    return { granted: false, canAskAgain: false, undetermined: false };
  }
}

// Fire the OS permission prompt (only meaningful when canAskAgain). Returns granted.
export async function requestPushPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

// Deep-link to this app's OS settings so the user can flip notifications back on
// after a permanent denial (the OS dialog can't be shown again at that point).
export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // openSettings is unavailable on some platforms — nothing else we can do.
  }
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
    const token = tokenData?.data ? await getFcmToken(tokenData.data) : null;
    if (token) {
      await api.delete('/api/v1/notifications/device-token', {
        data: { token },
      });
    }
  } catch (e) {
    console.warn('Failed to remove push token:', e);
  }
}

// Report that the user tapped/opened a push. Fire-and-forget — the backend only
// knows a push was "sent" until the app reports "opened" on tap. A failed call
// (offline, timeout) only affects an analytics number, never the user's flow, so
// swallow errors and never block navigation on it. Idempotent server-side.
export async function markNotificationOpened(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await api.patch(`/api/v1/notifications/${notificationId}/opened`);
  } catch (_) {
    // intentionally ignored — see above
  }
}

export function addPushTokenRefreshListener(callback: (token: string) => void) {
  if (!Notifications) return { remove: () => {} };
  // On iOS this fires with the raw APNs token — exchange it like registration does.
  return Notifications.addPushTokenListener(({ data }: { data: string }) => {
    getFcmToken(data).then((token) => { if (token) callback(token); });
  });
}

// On iOS, expo-notifications only reads a remote push's data from an Expo-style
// `body` key. FCM puts the data keys at the top level of the APNs payload, which
// expo exposes as the push trigger's payload — fall back to that.
function notificationData(notification: any): any {
  const request = notification?.request;
  const data = request?.content?.data;
  if (data && Object.keys(data).length > 0) return data;
  return request?.trigger?.payload || null;
}

// The callback also receives the tapped action's identifier. A plain body tap is
// the DEFAULT action; an action button sends its own identifier ('track', 'rate', …).
export function addNotificationResponseListener(
  callback: (data: any, actionIdentifier?: string) => void,
) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener((response: any) => {
    callback(notificationData(response.notification), response.actionIdentifier);
  });
}

export async function getLastNotificationResponse(): Promise<
  { data: any; actionIdentifier?: string } | null
> {
  if (!Notifications) return null;
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return null;
  return {
    data: notificationData(response.notification),
    actionIdentifier: response.actionIdentifier,
  };
}
