import axios from 'axios';
import { getToken } from '../utils/tokenStore';
import { FORCE_LOGOUT_CODES, forceLogout } from '../utils/forceLogout';

// Backend base URL — the AWS backend at api.karmaverse.earth. Can still be
// overridden per build via the EXPO_PUBLIC_API_URL env (eas.json / CI input).
export const BACKEND_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.karmaverse.earth';
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
    '/auth/apple-login',
    '/auth/reset-password',
    // Carries a restore token in the body instead of a session.
    '/account/restore',
  ].some((e) => url.includes(e));
};

// Add a request interceptor to automatically add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    if (!isAuthEndpoint(config.url)) {
      const token = await getToken();
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
    const status = error.response?.status;
    const code = error.response?.data?.code;
    // Token expired or invalid on a protected route, or the account was
    // deactivated/deleted on another device — clear it and send the user back to
    // Login so they re-authenticate. Without this the app sits in a broken
    // logged-in state. The code tells Login which message to show.
    if (
      (status === 401 || (status === 403 && code === 'ACCOUNT_NOT_ACTIVE')) &&
      !isAuthEndpoint(error.config?.url)
    ) {
      await forceLogout(FORCE_LOGOUT_CODES.has(code) || code === 'ACCOUNT_NOT_ACTIVE' ? code : undefined);
    }
    return Promise.reject(error);
  }
);

export default api;
