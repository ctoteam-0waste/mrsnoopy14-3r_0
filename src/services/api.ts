import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Testing backend (Render).
export const BACKEND_BASE = 'https://karmacoin-backend-testing.onrender.com';
const BASE_URL = BACKEND_BASE;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout to allow Render free tier to wake up
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints must behave exactly like Postman: no stale Authorization header
// on the way in, and a 401 (e.g. wrong password) must NOT wipe stored state.
// A leftover token being sent to /auth/login was making the backend reject an
// otherwise-valid login that worked fine in Postman.
const isAuthEndpoint = (url?: string) => {
  if (!url) return false;
  return [
    '/auth/login',
    '/auth/register',
    '/auth/check-user',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/google-login',
    '/auth/facebook-login',
    '/auth/reset-password',
  ].some((e) => url.includes(e));
};

// Add a request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    if (!isAuthEndpoint(config.url)) {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally (e.g., token expiry)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401 && !isAuthEndpoint(error.config?.url)) {
      // Token expired or invalid on a protected route — clear it.
      await AsyncStorage.removeItem('userToken');
      // Navigation to login should ideally be handled at the router/context level
    }
    return Promise.reject(error);
  }
);

export default api;
