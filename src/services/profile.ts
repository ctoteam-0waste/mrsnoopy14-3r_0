import api from './api';

export const profileService = {
  // Update demographics during signup or from profile edit
  updateDemographics: async (data: { age?: number, gender?: string, maritalStatus?: string, employment?: string }) => {
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
      const response = await api.patch('/api/v1/users/account', data);
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
      const response = await api.patch('/api/v1/user/address', data);
      return response.data;
    } catch (error) {
      console.error('Update Address Error:', error);
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
