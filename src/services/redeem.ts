import api from './api';

export const redeemService = {
  // Submit a redeem request — deducts coins from the wallet immediately, status starts PENDING
  create: async (data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
    coinsToRedeem: number;
  }) => {
    try {
      const response = await api.post('/api/v1/redeem', data);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Create Redeem Request Error:', error);
      throw error;
    }
  },

  // Get the current user's redeem request history, newest first
  getMyRequests: async () => {
    try {
      const response = await api.get('/api/v1/redeem/my');
      return response.data.data || response.data || [];
    } catch (error) {
      console.error('Get My Redeem Requests Error:', error);
      throw error;
    }
  },
};
