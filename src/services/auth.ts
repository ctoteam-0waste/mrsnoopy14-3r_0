import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeToken, setToken } from '../utils/tokenStore';
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
        console.error('Login failed: no token in response');
        throw new Error('Authentication failed: No token received from server');
      }

      await setToken(token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Check if User exists — accepts an email OR a mobile number. The backend
  // validates whichever key it receives, so a phone must NOT be sent under the
  // email key (it gets rejected as "Invalid email address").
  checkUser: async (identifier: string) => {
    const isPhone = /^\d+$/.test(identifier);
    const payload = isPhone
      ? { phone: identifier, identifier }
      : { email: identifier, identifier };
    try {
      const response = await api.post('/api/v1/auth/check-user', payload);
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
      await setToken(token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Google Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Facebook Login — send accessToken to backend, receive our JWT (mirrors googleLogin above).
  facebookLogin: async (accessToken: string) => {
    try {
      const response = await api.post('/api/v1/auth/facebook-login', { accessToken });
      const token = extractToken(response.data);
      if (!token) throw new Error('No token received');
      await setToken(token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Facebook Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Apple Sign-In — send Apple's identityToken (+ name on first authorization only)
  // to backend, receive our JWT (mirrors googleLogin/facebookLogin above). The
  // authorizationCode lets the backend get a refresh token, which Apple requires it
  // to revoke when the user deletes their account.
  // Backend TODO: POST /api/v1/auth/apple-login — see IOS_AUTH_BACKEND_SPEC.md.
  appleLogin: async (identityToken: string, authorizationCode?: string | null, fullName?: string | null) => {
    try {
      const response = await api.post('/api/v1/auth/apple-login', { identityToken, authorizationCode, fullName });
      const token = extractToken(response.data);
      if (!token) throw new Error('No token received');
      await setToken(token);

      registerForPushNotifications().then(fcmToken => {
        if (fcmToken) sendTokenToBackend(fcmToken);
      }).catch(() => {});

      return response.data;
    } catch (error: any) {
      console.error('Apple Login Error:', error?.response?.data || error);
      throw error;
    }
  },

  sendOtp: async (phone: string, purpose: string) => {
    const response = await api.post('/api/v1/auth/send-otp', { phone, purpose });
    return response.data;
  },

  // Forgot-password only: the user can supply EITHER a phone OR an email. When an
  // email is given the backend resolves the linked phone, sends the OTP there, and
  // returns that phone in data.phone — read it and use it for the rest of the flow.
  sendForgotOtp: async (identifier: { phone?: string; email?: string }) => {
    const body: any = { purpose: 'forgot-password' };
    if (identifier.email) body.email = identifier.email.trim();
    else body.phone = (identifier.phone || '').trim();
    const response = await api.post('/api/v1/auth/send-otp', body);
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
      await removeToken();
      // Clear the social-login SDK sessions too. Without this, Facebook/Google
      // keep the previous account cached, so the next login is forced back into
      // that same account and a different ID can't sign in.
      await clearSocialSessions();
    }
  }
};

// Sign the native Facebook and Google SDKs out so a logged-out user can pick a
// different account next time. Wrapped in try/catch and lazy-required so it's a
// no-op on web and in Expo Go where the native modules aren't present.
const clearSocialSessions = async () => {
  try {
    const { LoginManager } = require('react-native-fbsdk-next');
    await LoginManager.logOut();
  } catch (_) {}
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    await GoogleSignin.signOut();
  } catch (_) {}
};
