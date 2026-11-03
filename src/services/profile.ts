import api from './api';
import { extractList } from '../utils/apiList';

export const profileService = {
  // Update demographics during signup or from profile edit
  updateDemographics: async (data: { age?: number, gender?: string, maritalStatus?: string, employment?: string, sexualOrientation?: string, city?: string, state?: string }) => {
    try {
      const response = await api.patch('/api/v1/users/profile', data);
      return response.data;
    } catch (error) {
      console.error('Update Demographics Error:', error);
      throw error;
    }
  },

  // Update name (email/phone are no longer accepted by this endpoint — use changeEmail/changePhone below)
  updateName: async (data: { name: string }) => {
    try {
      const response = await api.patch('/api/v1/users/profile', data);
      return response.data;
    } catch (error) {
      console.error('Update Name Error:', error);
      throw error;
    }
  },

  // Persist the chosen preset-avatar id on the profile. Stored locally too, so the
  // pick shows instantly and survives even if the backend hasn't wired the field yet.
  updateAvatar: async (avatarId: string) => {
    try {
      const response = await api.patch('/api/v1/users/profile', { avatarId });
      return response.data;
    } catch (error) {
      console.error('Update Avatar Error:', error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/v1/users/profile');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get Profile Error:', error);
      throw error;
    }
  },

  // Update Address
  updateAddress: async (data: { fullAddress: string; longitude?: number; latitude?: number }) => {
    try {
      const response = await api.patch('/api/v1/users/address', data);
      return response.data;
    } catch (error) {
      console.error('Update Address Error:', error);
      throw error;
    }
  },

  // Claim quiz reward coins
  claimQuizReward: async (coins: number) => {
    try {
      const response = await api.post('/api/v1/quiz/claim-reward', { coins });
      return response.data;
    } catch (error) {
      console.error('Claim Quiz Reward Error:', error);
      throw error;
    }
  },

  // Change email — requires otpToken from authService.verifyOtp(currentPhone, otp, 'change-email')
  changeEmail: async (newEmail: string, otpToken: string) => {
    try {
      const response = await api.put('/api/v1/users/change-email', { newEmail, otpToken });
      return response.data;
    } catch (error: any) {
      // Log only a safe message — never the raw axios error, which carries the
      // Authorization header (JWT) and the request body in error.config.
      console.error('Change email failed:', error?.response?.data?.message || error?.message);
      throw error;
    }
  },

  // Change phone — requires otpToken from authService.verifyOtp(newPhone, otp, 'change-phone')
  changePhone: async (newPhone: string, otpToken: string) => {
    try {
      const response = await api.put('/api/v1/users/change-phone', { newPhone, otpToken });
      return response.data;
    } catch (error: any) {
      // Safe message only — the raw axios error leaks the JWT (Authorization
      // header) and the new phone number via error.config.
      console.error('Change phone failed:', error?.response?.data?.message || error?.message);
      throw error;
    }
  },

  // Get Transaction History
  getTransactionHistory: async () => {
    try {
      const response = await api.get('/api/v1/transactions/history');
      // Robust to any wrapper shape (see extractList) so the wallet list never
      // silently shows empty when the backend changes the transactions shape.
      return extractList(response.data);
    } catch (error) {
      console.error('Get Transactions Error:', error);
      throw error;
    }
  }
};
