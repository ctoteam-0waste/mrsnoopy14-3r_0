import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNotifications } from './NotificationContext';
import { BACKEND_BASE } from '../services/api';

const SOCKET_URL = BACKEND_BASE;

export type BookingStatusEvent =
  | 'BOOKING_ACCEPTED'
  | 'AGENT_REACHED'
  | 'BOOKING_PICKED_UP'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_CANCEL_SUCCESS'
  | 'BOOKING_IN_POOL';

export interface BookingUpdate {
  event: BookingStatusEvent | 'AGENT_LOCATION';
  bookingId: string;
  message: string;
  totalKarmaCoins?: number;
  agentId?: string;
  agent?: { name: string; rating?: number; phone?: string };
  agentLocation?: { lat: number; lng: number };
}

interface UserSocketContextType {
  isConnected: boolean;
  latestUpdate: BookingUpdate | null;
  clearLatestUpdate: () => void;
  reconnect: () => void;
  agentLocation: { lat: number; lng: number } | null;
}

const UserSocketContext = createContext<UserSocketContextType>({
  isConnected: false,
  latestUpdate: null,
  clearLatestUpdate: () => {},
  reconnect: () => {},
  agentLocation: null,
});

export function UserSocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestUpdate, setLatestUpdate] = useState<BookingUpdate | null>(null);
  const [agentLocation, setAgentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { addNotification } = useNotifications();

  const connectSocket = useCallback(async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return;

    if (socketRef.current?.connected) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[UserSocket] Connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('[UserSocket] Disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('[UserSocket] Error:', err.message);
      setIsConnected(false);
    });

    socket.on('BOOKING_ACCEPTED', (data: any) => {
      const agentObj = data.agent || data.booking?.agent || null;
      const msg = data.message || 'Agent accepted your booking and is on the way!';
      setLatestUpdate({ event: 'BOOKING_ACCEPTED', bookingId: data.bookingId || data.booking?._id, message: msg, agentId: data.agentId, agent: agentObj });
      addNotification({ type: 'BOOKING_ACCEPTED', title: 'Agent assigned', message: msg, bookingId: data.bookingId });
    });

    socket.on('AGENT_REACHED', (data: any) => {
      const msg = data.message || 'Agent has reached your location!';
      setLatestUpdate({ event: 'AGENT_REACHED', bookingId: data.bookingId, message: msg });
      addNotification({ type: 'AGENT_REACHED', title: 'Agent arrived', message: msg, bookingId: data.bookingId });
    });

    socket.on('BOOKING_PICKED_UP', (data: any) => {
      const coins = data.totalKarmaCoins || 0;
      const msg = data.message || `${coins} KarmaCoins credited to your wallet!`;
      setLatestUpdate({ event: 'BOOKING_PICKED_UP', bookingId: data.bookingId, message: msg, totalKarmaCoins: coins });
      addNotification({ type: 'BOOKING_PICKED_UP', title: `+${coins} KarmaCoins XP`, message: msg, bookingId: data.bookingId });
    });

    socket.on('BOOKING_COMPLETED', (data: any) => {
      const msg = data.message || 'Your booking is completed. Thank you!';
      setLatestUpdate({ event: 'BOOKING_COMPLETED', bookingId: data.bookingId, message: msg });
      addNotification({ type: 'BOOKING_COMPLETED', title: 'Pickup complete', message: msg, bookingId: data.bookingId });
    });

    socket.on('BOOKING_CANCEL_SUCCESS', (data: any) => {
      const msg = data.message || 'Booking cancelled successfully.';
      setLatestUpdate({ event: 'BOOKING_CANCEL_SUCCESS', bookingId: data.bookingId, message: msg });
      addNotification({ type: 'BOOKING_CANCEL_SUCCESS', title: 'Booking cancelled', message: msg, bookingId: data.bookingId });
    });

    socket.on('BOOKING_IN_POOL', (data: any) => {
      const msg = data.message || 'High demand in your area. Your booking is in our priority pool.';
      setLatestUpdate({ event: 'BOOKING_IN_POOL', bookingId: data.bookingId, message: msg });
      addNotification({ type: 'BOOKING_IN_POOL', title: 'Added to priority queue', message: msg, bookingId: data.bookingId });
    });

    // Backend emits 'agent:location' with flat payload: { bookingId, lat, lng, timestamp }
    socket.on('agent:location', (data: any) => {
      const { lat, lng } = data;
      if (lat != null && lng != null) {
        setAgentLocation({ lat, lng });
      }
      setLatestUpdate({
        event: 'AGENT_LOCATION',
        bookingId: data.bookingId,
        message: 'Agent location updated',
        agentLocation: { lat, lng },
      });
    });
  }, []);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const clearLatestUpdate = useCallback(() => setLatestUpdate(null), []);

  return (
    <UserSocketContext.Provider value={{ isConnected, latestUpdate, clearLatestUpdate, reconnect: connectSocket, agentLocation }}>
      {children}
    </UserSocketContext.Provider>
  );
}

export const useUserSocket = () => useContext(UserSocketContext);
