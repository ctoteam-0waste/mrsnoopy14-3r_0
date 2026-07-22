import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, sendTokenToBackend, removeTokenFromBackend } from '../utils/notifications';

// Pull the JWT out of a login/register/google response no matter which shape the
// backend uses. Different endpoints have historically returned the token in
// different places, so we check every known location before giving up.
const extractToken = (data: any): string | undefined => {
  if (!data) return undefined;
  const d = data.data ?? data;
  return (
    d?.token ||
    d?.accessToken ||
    d?.access_token ||
    d?.jwt ||
    d?.authToken ||
    d?.tokens?.access ||
    d?.tokens?.accessToken ||
    d?.user?.token ||
    data?.token ||
    data?.accessToken
  );
};

export const authService = {
  // Login
  login: async (identifier: string, passwordOrOtp: string) => {
    try {
      const response = await api.post('/api/v1/auth/login', { 
        identifier: identifier, 
        password: passwordOrOtp 
      });
      
      // Safely extract token whether it's nested inside 'data' or directly on the response
      const token = extractToken(response.data);

      if (!token) {
        console.error('Login: no token in response', JSON.stringify(response.data));
        throw new Error('Authentication failed: No token received from server');
      }

      await AsyncStorage.setItem('userToken', token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Check if User exists
  checkUser: async (email: string) => {
    try {
      const response = await api.post('/api/v1/auth/check-user', { email });
      return response.data;
    } catch (error: any) {
      console.error('Check User Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Signup / Register — otpToken from verifyOtp required; referralCode optional (omit if blank)
  register: async (data: { name: string, email: string, phone: string, password: string, otpToken: string, referralCode?: string }) => {
    try {
      const payload: any = { ...data };
      if (!payload.referralCode) delete payload.referralCode;
      const response = await api.post('/api/v1/auth/register', payload);
      return response.data;
    } catch (error: any) {
      console.error('Register Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Reset Password — phone + otpToken from verifyOtp required
  resetPassword: async (phone: string, newPassword: string, otpToken: string) => {
    try {
      const response = await api.post('/api/v1/auth/reset-password', { phone, newPassword, otpToken });
      return response.data;
    } catch (error: any) {
      console.error('Reset Password Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Google Sign-In — send idToken to backend, receive our JWT
  googleLogin: async (idToken: string) => {
    try {
      const response = await api.post('/api/v1/auth/google-login', { idToken });
      const token = extractToken(response.data);
      if (!token) throw new Error('No token received');
      await AsyncStorage.setItem('userToken', token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Google Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Facebook Login — send accessToken to backend, receive our JWT.
  // Backend must verify the token against the Graph API and issue our JWT, mirroring
  // /api/v1/auth/google-login — see /api/v1/auth/facebook-login (not yet implemented server-side).
  facebookLogin: async (accessToken: string) => {
    try {
      const response = await api.post('/api/v1/auth/facebook-login', { accessToken });
      const token = extractToken(response.data);
      if (!token) throw new Error('No token received');
      await AsyncStorage.setItem('userToken', token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Facebook Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  sendOtp: async (phone: string, purpose: string) => {
    const response = await api.post('/api/v1/auth/send-otp', { phone, purpose });
    return response.data;
  },

  verifyOtp: async (phone: string, otp: string, purpose: string) => {
    const response = await api.post('/api/v1/auth/verify-otp', { phone, otp, purpose });
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      await removeTokenFromBackend();
    } catch (_) {}
    try {
      await api.get('/api/v1/auth/logout');
    } catch (error) {
      console.log('Logout API failed, clearing local token anyway');
    } finally {
      await AsyncStorage.removeItem('userToken');
    }
  }
};
