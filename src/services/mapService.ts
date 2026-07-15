import api from './api';

export interface MapSuggestion {
  placeName: string;
  address: string;
  eLoc: string;
  lat: number;
  lng: number;
}

export interface PlaceDetail {
  eLoc: string;
  placeName: string;
  address: string;
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
}

export interface RouteResult {
  distance: number;   // meters
  duration: number;   // seconds
  polyline: string;   // encoded polyline
  steps: any[];
}

let _cachedKey: string | null = null;

async function getKey(): Promise<string> {
  if (_cachedKey) return _cachedKey;
  const response = await api.get('/api/v1/map/config');
  const key: string = response.data.data.mapSdkKey || response.data.data.accessToken;
  _cachedKey = key;
  console.log('[mapService] SDK key loaded');
  return key;
}

export const mapService = {
  getMapConfig: async (): Promise<string> => {
    return getKey();
  },

  autosuggest: async (query: string, lat?: number, lng?: number): Promise<MapSuggestion[]> => {
    const params: Record<string, any> = { query };
    if (lat !== undefined) params.lat = lat;
    if (lng !== undefined) params.lng = lng;
    console.log('[mapService] autosuggest →', query);
    const response = await api.get('/api/v1/map/autosuggest', { params });
    console.log('[mapService] autosuggest results:', response.data.data?.length ?? 0);
    return response.data.data || [];
  },

  placeDetail: async (eLoc: string): Promise<PlaceDetail> => {
    const response = await api.get('/api/v1/map/place-detail', { params: { eLoc } });
    return response.data.data;
  },

  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    const response = await api.get('/api/v1/map/reverse-geocode', { params: { lat, lng } });
    return response.data.data;
  },

  getRoute: async (startLat: number, startLng: number, endLat: number, endLng: number): Promise<RouteResult> => {
    const response = await api.get('/api/v1/map/route', {
      params: { startLat, startLng, endLat, endLng },
    });
    return response.data.data;
  },

  getBookingRoute: async (bookingId: string, agentLat: number, agentLng: number): Promise<RouteResult> => {
    const response = await api.get(`/api/v1/map/route/booking/${bookingId}`, {
      params: { lat: agentLat, lng: agentLng },
    });
    return response.data.data;
  },
};
