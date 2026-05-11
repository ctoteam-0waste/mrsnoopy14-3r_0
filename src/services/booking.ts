import api from './api';

export const bookingService = {
  createBooking: async (data: {
    categories: { category: string; subCategory: string }[];
    pickupDate: string;
    timeSlot: string;
    address: {
      fullAddress: string;
      location: {
        type: 'Point';
        coordinates: [number, number];
      };
    };
  }) => {
    try {
      const response = await api.post('/api/v1/bookings', data);
      return response.data;
    } catch (error) {
      console.error('Create Booking Error:', error);
      throw error;
    }
  },

  getMyBookings: async () => {
    try {
      const response = await api.get('/api/v1/bookings/my-bookings');
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get Bookings Error:', error);
      throw error;
    }
  }
};
