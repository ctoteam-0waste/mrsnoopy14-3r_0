import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../utils/tokenStore';
import { getStableUserSuffix } from '../utils/userId';
import api from '../services/api';
import {
  isPushSupported,
  getPushPermission,
  requestPushPermission,
  openNotificationSettings,
  registerForPushNotifications,
  sendTokenToBackend,
} from '../utils/notifications';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  // Where a tap should go, when the backend set it (route / screen / booking status).
  target?: { route?: string; screen?: string; status?: string };
  timestamp: number;
  read: boolean;
}

type NewNotification = Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { notificationId?: string };

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (data: NewNotification) => void;
  // Re-read the list from the backend (bell opened, app back in the foreground).
  refreshNotifications: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  // OS push permission. null = unknown/loading or push not supported on this build.
  pushEnabled: boolean | null;
  // Turn push on: prompts the OS if it still can, else opens app settings.
  enablePush: () => Promise<void>;
  // Re-read the OS permission (called on app foreground).
  refreshPushPermission: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  refreshNotifications: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
  pushEnabled: null,
  enablePush: async () => {},
  refreshPushPermission: async () => {},
});

// Notifications are stored per user. This used to be one shared key, so a new
// account signing in on the same device inherited the previous user's history
// ("quiz played", past bookings) even though it had none of its own.
const LEGACY_SHARED_KEY = 'appNotifications';
const keyFor = (userSuffix: string) => `appNotifications_${userSuffix}`;
const MAX_NOTIFICATIONS = 50;

// The bell list lives on the backend (GET /notifications), so every device shows
// the same items, read state and badge. Until that endpoint answers (older
// backend: 404), the list falls back to the old per-device copy in AsyncStorage.
const EVENT_LABELS: Record<string, string> = {
  BOOKING_ACCEPTED: 'Agent assigned',
  AGENT_REACHED: 'Agent arrived',
  BOOKING_PICKED_UP: 'Coins credited',
  BOOKING_COMPLETED: 'Pickup complete',
  BOOKING_CANCEL_SUCCESS: 'Booking cancelled',
  BOOKING_IN_POOL: 'Added to priority queue',
  QUIZ_COMPLETED: 'Daily quiz complete!',
};

const fromServer = (n: any): AppNotification => ({
  id: String(n._id ?? n.id),
  type: n.event || n.type || '',
  title: n.title || EVENT_LABELS[n.event] || 'Notification',
  message: n.body || n.data?.message || '',
  bookingId: n.data?.bookingId || n.bookingId,
  target: { route: n.data?.route, screen: n.data?.screen, status: n.data?.status },
  timestamp: Date.parse(n.createdAt) || Date.now(),
  read: !!n.read,
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [serverUnread, setServerUnread] = useState<number | null>(null);
  // null = not known yet, true = backend list in use, false = old per-device list.
  const serverMode = useRef<boolean | null>(null);
  // Ref (not state) because persist() runs inside setState updaters, which must
  // read the current user synchronously without re-creating the callbacks.
  const userKeyRef = useRef<string | null>(null);

  // Drop the old shared bucket once, so its entries can never leak into an account.
  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_SHARED_KEY).catch(() => {});
  }, []);

  // Follow the logged-in user. Polling the token covers every path that changes
  // it — login, logout, switch account, token refresh — without the provider
  // needing to sit below the auth/socket contexts.
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const token = await getToken();
      const next = token ? getStableUserSuffix(token) : null;
      if (cancelled || next === userKeyRef.current) return;

      userKeyRef.current = next;
      if (!next) {
        serverMode.current = null;
        setServerUnread(null);
        setNotifications([]); // logged out — show nothing
        return;
      }
      if (await loadFromServer()) {
        // The old device copy is no longer the source; drop it.
        AsyncStorage.removeItem(keyFor(next)).catch(() => {});
        return;
      }
      try {
        const raw = await AsyncStorage.getItem(keyFor(next));
        if (!cancelled) setNotifications(raw ? JSON.parse(raw) : []);
      } catch {
        if (!cancelled) setNotifications([]);
      }
    };

    sync();
    const timer = setInterval(sync, 1500);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // Reads the list from the backend. Returns false when the backend has no list
  // endpoint yet (404), so the caller keeps the per-device copy.
  async function loadFromServer(): Promise<boolean> {
    if (serverMode.current === false) return false;
    try {
      const res = await api.get('/api/v1/notifications', { params: { limit: MAX_NOTIFICATIONS, page: 1 } });
      const body = res.data?.items ? res.data : (res.data?.data ?? res.data);
      const items: any[] = Array.isArray(body?.items) ? body.items : [];
      serverMode.current = true;
      setNotifications(items.map(fromServer));
      setServerUnread(typeof body?.unreadCount === 'number' ? body.unreadCount : null);
      return true;
    } catch (e: any) {
      if (e?.response?.status === 404) serverMode.current = false;
      return serverMode.current === true; // keep the last list on a network blip
    }
  }

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshNotifications = useCallback(() => {
    if (!userKeyRef.current || serverMode.current === false) return;
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    // A short delay so a burst of socket events (or a write just sent) is read once.
    refreshTimer.current = setTimeout(() => { loadFromServer(); }, 600);
  }, []);

  // Back in the foreground: other devices may have changed the list.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') refreshNotifications(); });
    return () => sub.remove();
  }, [refreshNotifications]);

  const persist = (items: AppNotification[]) => {
    const key = userKeyRef.current;
    if (!key || serverMode.current) return; // per-device copy only without the backend list
    AsyncStorage.setItem(keyFor(key), JSON.stringify(items));
  };

  const addNotification = useCallback((data: NewNotification) => {
    // With the backend list, the backend creates the quiz item itself: adding it
    // here too would show it twice.
    if (serverMode.current && data.type === 'QUIZ_COMPLETED') { refreshNotifications(); return; }
    const { notificationId, ...rest } = data;
    const notif: AppNotification = {
      ...rest,
      id: notificationId || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [notif, ...prev.filter(n => n.id !== notif.id)].slice(0, MAX_NOTIFICATIONS);
      persist(updated);
      return updated;
    });
    if (serverMode.current) {
      setServerUnread(c => (c === null ? null : c + 1));
      refreshNotifications();
    }
  }, [refreshNotifications]);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist(updated);
      return updated;
    });
    if (serverMode.current) {
      setServerUnread(c => (c ? c - 1 : c));
      api.patch(`/api/v1/notifications/${id}/read`).catch(() => {}).finally(refreshNotifications);
    }
  }, [refreshNotifications]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
    if (serverMode.current) {
      setServerUnread(0);
      api.patch('/api/v1/notifications/read-all').catch(() => {}).finally(refreshNotifications);
    }
  }, [refreshNotifications]);

  const clearAll = useCallback(() => {
    setNotifications([]);
    const key = userKeyRef.current;
    if (serverMode.current) {
      setServerUnread(0);
      api.delete('/api/v1/notifications').catch(() => {}).finally(refreshNotifications);
    } else if (key) {
      AsyncStorage.removeItem(keyFor(key));
    }
  }, [refreshNotifications]);

  const unreadCount = serverUnread ?? notifications.filter(n => !n.read).length;

  // ── OS push permission (re-enable flow) ──────────────────────────────────
  // null until the first read; stays null on builds where push isn't supported
  // (web / Expo Go), so the re-enable banner never shows there.
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const canAskAgainRef = useRef(true);

  const refreshPushPermission = useCallback(async () => {
    if (!isPushSupported()) { setPushEnabled(null); return; }
    const p = await getPushPermission();
    canAskAgainRef.current = p.canAskAgain;
    setPushEnabled(p.granted);
    // Granted but the backend may not have a live token yet (first grant, a
    // silent registration failure, a reinstall) — re-register, it's idempotent.
    if (p.granted) {
      registerForPushNotifications()
        .then(t => { if (t) sendTokenToBackend(t); })
        .catch(() => {});
    }
  }, []);

  const enablePush = useCallback(async () => {
    if (!isPushSupported()) return;
    if (canAskAgainRef.current) {
      const granted = await requestPushPermission();
      if (granted) {
        const t = await registerForPushNotifications();
        if (t) sendTokenToBackend(t);
      }
    } else {
      // OS won't prompt again — hand the user to app settings. State refreshes
      // on their return via the AppState listener below.
      await openNotificationSettings();
    }
    await refreshPushPermission();
  }, [refreshPushPermission]);

  // Check on mount and every time the app comes to the foreground (catches a
  // permission the user revoked — or granted — in Settings while backgrounded).
  useEffect(() => {
    refreshPushPermission();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') refreshPushPermission();
    });
    return () => sub.remove();
  }, [refreshPushPermission]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, refreshNotifications, markRead, markAllRead, clearAll, pushEnabled, enablePush, refreshPushPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
