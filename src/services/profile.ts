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

  // Update Account Details
  updateAccount: async (data: { name?: string, email?: string, phone?: string }) => {
    try {
      const response = await api.patch('/api/v1/users/profile', data);
      return response.data;
    } catch (error) {
      console.error('Update Account Error:', error);
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

  // Send OTP for profile change verification
  sendProfileOtp: async (value: string, isEmail: boolean, currentPhone?: string, currentEmail?: string) => {
    const payload = isEmail
      ? { email: value, phone: currentPhone, purpose: 'change-email' }
      : { phone: value, email: currentEmail, purpose: 'change-phone' };
    const response = await api.post('/api/v1/auth/send-otp', payload);
    return response.data;
  },

  // Verify profile change OTP
  verifyProfileOtp: async (value: string, otp: string, isEmail: boolean, currentPhone?: string, currentEmail?: string) => {
    const payload = isEmail
      ? { email: value, otp, phone: currentPhone, purpose: 'change-email' }
      : { phone: value, otp, email: currentEmail, purpose: 'change-phone' };
    const response = await api.post('/api/v1/auth/verify-otp', payload);
    return response.data;
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
