import api from './api';

export const referralService = {
  getMyCode: async () => {
    const response = await api.get('/api/v1/referral/my-code');
    return response.data.data || response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/v1/referral/stats');
    return response.data.data || response.data;
  },

  validateCode: async (referralCode: string) => {
    const response = await api.post('/api/v1/referral/validate', { referralCode });
    return response.data.data || response.data;
  },
};
