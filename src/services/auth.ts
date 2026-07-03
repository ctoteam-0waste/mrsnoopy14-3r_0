import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications, sendTokenToBackend, removeTokenFromBackend } from '../utils/notifications';

export const authService = {
  // Login
  login: async (identifier: string, passwordOrOtp: string) => {
    try {
      const response = await api.post('/api/v1/auth/login', { 
        identifier: identifier, 
        password: passwordOrOtp 
      });
      
      // Safely extract token whether it's nested inside 'data' or directly on the response
      const token = response.data?.data?.token || response.data?.token;
      
      if (!token) {
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

  // Signup / Register
  register: async (data: { name: string, email: string, phone: string, password: string }) => {
    try {
      const response = await api.post('/api/v1/auth/register', data);
      // Currently backend register doesn't return a token, just user data.
      // We might need to login immediately after register or handle it gracefully.
      return response.data;
    } catch (error: any) {
      console.error('Register Error:', error?.response?.data || error);
      throw error;
    }
  },

  // Reset Password
  resetPassword: async (email: string, newPassword: string) => {
    try {
      const response = await api.post('/api/v1/auth/reset-password', { email, newPassword });
      return response.data;
    } catch (error: any) {
      console.error('Reset Password Error:', error?.response?.data || error);
      throw error;
    }
  },
  
  // Google Sign-In — send idToken to backend, receive our JWT
  googleLogin: async (idToken: string) => {
    try {
      const response = await api.post('/api/v1/auth/google', { idToken });
      const token = response.data?.data?.token || response.data?.token;
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

  // Send OTP for forgot password
  sendForgotPasswordOtp: async (email: string) => {
    const response = await api.post('/api/v1/auth/forgot-password', { email });
    return response.data;
  },

  // Verify OTP for forgot password
  verifyForgotPasswordOtp: async (email: string, otp: string) => {
    const response = await api.post('/api/v1/auth/verify-otp', { email, otp });
    return response.data;
  },

  // Send OTP for signup verification
  sendSignupOtp: async (email: string) => {
    const response = await api.post('/api/v1/auth/send-otp', { email });
    return response.data;
  },

  // Verify signup OTP
  verifySignupOtp: async (email: string, otp: string) => {
    const response = await api.post('/api/v1/auth/verify-otp', { email, otp });
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
