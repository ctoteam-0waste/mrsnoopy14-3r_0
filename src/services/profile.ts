import api from './api';

export const profileService = {
  // Update demographics during signup or from profile edit
  updateDemographics: async (data: { age?: number, gender?: string, maritalStatus?: string, employment?: string, sexualOrientation?: string }) => {
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
    } catch (error) {
      console.error('Change Email Error:', error);
      throw error;
    }
  },

  // Change phone — requires otpToken from authService.verifyOtp(newPhone, otp, 'change-phone')
  changePhone: async (newPhone: string, otpToken: string) => {
    try {
      const response = await api.put('/api/v1/users/change-phone', { newPhone, otpToken });
      return response.data;
    } catch (error) {
      console.error('Change Phone Error:', error);
      throw error;
    }
  },

  // Get Transaction History
  getTransactionHistory: async () => {
    try {
      const response = await api.get('/api/v1/transactions/history');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Get Transactions Error:', error);
      throw error;
    }
  }
};
