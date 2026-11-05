import api from './api';
import { extractList } from '../utils/apiList';

export const bookingService = {
  createBooking: async (data: {
    categories: { category: string; subCategory: string; condition?: string; quantity: number }[];
    pickupDate: string;
    timeSlot: string;
    address: {
      fullAddress: string;
      location: {
        type: 'Point';
        coordinates: [number, number];
      };
    };
    specialInstruction?: string;
  }, idempotencyKey?: string) => {
    try {
      const response = await api.post(
        '/api/v1/bookings',
        data,
        idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
      );
      return response.data;
    } catch (error) {
      console.error('Create Booking Error:', error);
      throw error;
    }
  },

  getBookingById: async (id: string) => {
    try {
      const response = await api.get(`/api/v1/bookings/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      console.error('Get Booking Error:', error);
      throw error;
    }
  },

  getMyBookings: async () => {
    try {
      const response = await api.get('/api/v1/bookings/my-bookings');
      // Backend has changed this response's shape without notice (array,
      // { data: [...] }, { bookings: [...] }, paginated { data: { docs: [...] } });
      // extractList finds the array in any of them so Orders never blanks or shows empty.
      return extractList(response.data);
    } catch (error) {
      console.error('Get Bookings Error:', error);
      throw error;
    }
  },

  cancelBooking: async (id: string) => {
    try {
      const response = await api.patch(`/api/v1/bookings/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel Booking Error:', error);
      throw error;
    }
  },

  submitRating: async (bookingId: string, rating: number, comment: string) => {
    try {
      const response = await api.post(`/api/v1/bookings/${bookingId}/rating`, { rating, comment });
      return response.data;
    } catch (error) {
      console.error('Submit Rating Error:', error);
      throw error;
    }
  },
};
