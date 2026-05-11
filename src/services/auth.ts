import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  // Login
  login: async (identifier: string, passwordOrOtp: string) => {
    try {
      const response = await api.post('/api/v1/auth/login', { 
        identifier: identifier, 
        password: passwordOrOtp 
      });
      
      const token = response.data.data.token;
      await AsyncStorage.setItem('userToken', token);
      
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
  
  // Logout
  logout: async () => {
    try {
      await api.get('/api/v1/auth/logout');
    } catch (error) {
      console.log('Logout API failed, clearing local token anyway');
    } finally {
      await AsyncStorage.removeItem('userToken');
    }
  }
};
