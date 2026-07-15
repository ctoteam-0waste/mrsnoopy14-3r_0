import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production backend (AWS).
export const BACKEND_BASE = 'https://api.karmaverse.earth';
const BASE_URL = BACKEND_BASE;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60 seconds timeout to allow Render free tier to wake up
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, handle logout here
      await AsyncStorage.removeItem('userToken');
      // Navigation to login should ideally be handled at the router/context level
    }
    return Promise.reject(error);
  }
);

export default api;
