import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStableUserSuffix } from '../utils/userId';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  bookingId?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clearAll: () => {},
});

// Notifications are stored per user. This used to be one shared key, so a new
// account signing in on the same device inherited the previous user's history
// ("quiz played", past bookings) even though it had none of its own.
const LEGACY_SHARED_KEY = 'appNotifications';
const keyFor = (userSuffix: string) => `appNotifications_${userSuffix}`;
const MAX_NOTIFICATIONS = 50;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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
      const token = await AsyncStorage.getItem('userToken');
      const next = token ? getStableUserSuffix(token) : null;
      if (cancelled || next === userKeyRef.current) return;

      userKeyRef.current = next;
      if (!next) {
        setNotifications([]); // logged out — show nothing
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

  const persist = (items: AppNotification[]) => {
    const key = userKeyRef.current;
    if (!key) return; // never write notifications while logged out
    AsyncStorage.setItem(keyFor(key), JSON.stringify(items));
  };

  const addNotification = useCallback((data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const notif: AppNotification = {
      ...data,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => {
      const updated = [notif, ...prev].slice(0, MAX_NOTIFICATIONS);
      persist(updated);
      return updated;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      persist(updated);
      return updated;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      persist(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    const key = userKeyRef.current;
    if (key) AsyncStorage.removeItem(keyFor(key));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
