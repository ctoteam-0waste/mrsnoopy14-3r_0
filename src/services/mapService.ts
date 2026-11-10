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

// The shared client waits 60 s (cold-start headroom). For type-ahead search that
// is far too long on a weak connection: one stalled request froze the list and
// then showed "Search failed". Use a short timeout and retry once on a network
// error, timeout or 5xx — 4xx are real answers and are not retried.
const SEARCH_TIMEOUT_MS = 10000;
const LOOKUP_TIMEOUT_MS = 12000;

function isTransient(e: any): boolean {
  if (!e?.response) return true; // network error / timeout / offline
  return e.response.status >= 500;
}

async function getWithRetry(url: string, params: Record<string, any>, timeout: number) {
  try {
    return await api.get(url, { params, timeout });
  } catch (e: any) {
    if (!isTransient(e)) throw e;
    console.warn('[mapService] retrying', url, '-', e?.code || e?.response?.status || e?.message);
    await new Promise((r) => setTimeout(r, 600));
    return api.get(url, { params, timeout });
  }
}

export const mapService = {
  getMapConfig: async (): Promise<string> => {
    return getKey();
  },

  autosuggest: async (query: string, lat?: number, lng?: number): Promise<MapSuggestion[]> => {
    const params: Record<string, any> = { query };
    // GPS fixes carry 15+ decimals; the location bias only needs ~10 m, and an
    // over-precise or non-finite value can make the provider reject the search.
    const hasBias = Number.isFinite(lat) && Number.isFinite(lng);
    if (hasBias) {
      params.lat = Number((lat as number).toFixed(6));
      params.lng = Number((lng as number).toFixed(6));
    }
    console.log('[mapService] autosuggest →', query);
    try {
      const response = await getWithRetry('/api/v1/map/autosuggest', params, SEARCH_TIMEOUT_MS);
      console.log('[mapService] autosuggest results:', response.data.data?.length ?? 0);
      return response.data.data || [];
    } catch (e: any) {
      // Auth / network failures aren't a bias problem — let them surface.
      if (!hasBias || !e?.response || e.response.status === 401) throw e;
      console.warn('[mapService] autosuggest with location failed, retrying without it:', e?.response?.status, e?.message);
      const response = await getWithRetry('/api/v1/map/autosuggest', { query }, SEARCH_TIMEOUT_MS);
      return response.data.data || [];
    }
  },

  placeDetail: async (eLoc: string): Promise<PlaceDetail> => {
    const response = await getWithRetry('/api/v1/map/place-detail', { eLoc }, LOOKUP_TIMEOUT_MS);
    return response.data.data;
  },

  reverseGeocode: async (lat: number, lng: number): Promise<ReverseGeocodeResult> => {
    const response = await getWithRetry('/api/v1/map/reverse-geocode', { lat, lng }, LOOKUP_TIMEOUT_MS);
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
