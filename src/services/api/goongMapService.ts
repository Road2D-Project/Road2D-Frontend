/**
 * goongMapService.ts — Trung gian gọi các dịch vụ Goong Map qua Backend.
 *
 * Toàn bộ request được gửi tới các endpoint /v1/goong/* của backend kèm
 * header X-Playground-Key để giấu kín GOONG_REST_KEY, không làm lộ key ở client.
 */
import axios from 'axios';
import { API_BASE_URL, PLAYGROUND_KEY } from '../../config/env';

const DEFAULT_PLAYGROUND_KEY = 'a0a49b054ebb742a6a8f68d187c46f47d88e667c';

const goongHttp = axios.create({
  timeout: 3500, // Tìm kiếm nhanh trong 3.5s, không để người dùng chờ lâu
});

export interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
}

export interface PlaceDetail {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteLegResult {
  coords: [number, number][]; // [[lng, lat], ...]
  distanceM: number;
  durationS: number;
}

/**
 * Chuẩn hóa base URL để luôn trỏ đúng tiền tố /v1 của Go backend.
 */
function getGoongApiBase(): string {
  let base = (API_BASE_URL || 'http://192.168.1.162:8080/v1').trim().replace(/\/+$/, '');
  if (base.endsWith('/api/v1')) {
    base = base.replace(/\/api\/v1$/, '/v1');
  } else if (!base.endsWith('/v1')) {
    base = `${base}/v1`;
  }
  return base;
}

/**
 * Giải mã Google / Goong encoded polyline → danh sách toạ độ [[lng, lat], ...]
 */
export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;

    coords.push([lng / 1e5, lat / 1e5]);
  }
  return coords;
}

// ─── Caches in-memory để tối ưu quota Goong API và trải nghiệm người dùng ───
const autocompleteCache = new Map<string, PlacePrediction[]>();
const placeDetailCache = new Map<string, PlaceDetail>();
const directionsCache = new Map<string, RouteLegResult>();

export const goongMapService = {
  /**
   * Tìm kiếm gợi ý địa điểm qua Backend:
   * GET /v1/goong/places/autocomplete
   */
  searchPlaces: async (input: string, location?: string): Promise<PlacePrediction[]> => {
    const text = input.trim();
    if (!text || text.length < 2) return [];

    const cacheKey = `${text.toLowerCase()}_${location || ''}`;
    if (autocompleteCache.has(cacheKey)) {
      return autocompleteCache.get(cacheKey)!;
    }

    try {
      const activeKey = PLAYGROUND_KEY || DEFAULT_PLAYGROUND_KEY;
      const baseUrl = getGoongApiBase();
      const params: Record<string, string> = {
        input: text,
        limit: '7',
        playground_key: activeKey,
      };
      if (location) {
        params.location = location;
      }

      const reqUrl = `${baseUrl}/goong/places/autocomplete`;
      console.log(`[Goong API] 📡 Autocomplete: ${reqUrl}?input=${encodeURIComponent(text)}`);

      // Gửi dạng Simple Request (không gửi custom header để tránh kích hoạt CORS Preflight OPTIONS trên Android DevTools)
      const res = await goongHttp.get(reqUrl, { params });

      const predictions = (res.data?.predictions ?? []) as PlacePrediction[];
      console.log(`[Goong API] ✅ Received ${predictions.length} predictions`);
      autocompleteCache.set(cacheKey, predictions);
      return predictions;
    } catch (err: any) {
      const errDetail = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : (err?.code ? `${err.message} (${err.code})` : err?.message || String(err));
      console.error(`[Goong API Error] ❌ Autocomplete failed: ${errDetail}`);
      return [];
    }
  },

  /**
   * Lấy toạ độ chi tiết của địa điểm qua Backend:
   * GET /v1/goong/places/detail
   */
  getPlaceDetail: async (placeId: string): Promise<PlaceDetail | null> => {
    if (!placeId) return null;

    if (placeDetailCache.has(placeId)) {
      return placeDetailCache.get(placeId)!;
    }

    try {
      const activeKey = PLAYGROUND_KEY || DEFAULT_PLAYGROUND_KEY;
      const baseUrl = getGoongApiBase();
      const params = {
        place_id: placeId,
        playground_key: activeKey,
      };

      const reqUrl = `${baseUrl}/goong/places/detail`;
      console.log(`[Goong API] 📡 Detail: ${reqUrl}?place_id=${placeId}`);

      const res = await goongHttp.get(reqUrl, { params });

      const r = res.data?.result;
      if (!r) return null;

      const detail: PlaceDetail = {
        place_id: placeId,
        lat: r.geometry?.location?.lat ?? 0,
        lng: r.geometry?.location?.lng ?? 0,
        name: r.name ?? r.formatted_address ?? '',
        address: r.formatted_address ?? '',
      };
      placeDetailCache.set(placeId, detail);
      return detail;
    } catch (err: any) {
      const errDetail = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : (err?.code ? `${err.message} (${err.code})` : err?.message || String(err));
      console.error(`[Goong API Error] ❌ Detail failed: ${errDetail}`);
      return null;
    }
  },

  /**
   * Tính toán lộ trình đường đi qua Backend:
   * GET /v1/goong/directions
   */
  getDirections: async (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    vehicle: string = 'bike'
  ): Promise<RouteLegResult | null> => {
    const cacheKey = `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}_${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}_${vehicle}`;
    if (directionsCache.has(cacheKey)) {
      return directionsCache.get(cacheKey)!;
    }

    try {
      const activeKey = PLAYGROUND_KEY || DEFAULT_PLAYGROUND_KEY;
      const baseUrl = getGoongApiBase();
      const params = {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        vehicle,
        playground_key: activeKey,
      };

      const reqUrl = `${baseUrl}/goong/directions`;
      console.log(`[Goong API] 📡 Directions: ${reqUrl}`);

      const res = await goongHttp.get(reqUrl, { params });

      const leg = res.data;
      // HandleDirection trả về tripmodel.Leg với trường polyline (encoded string)
      const polylineStr = leg?.polyline ?? '';
      const coords = decodePolyline(polylineStr);

      const result: RouteLegResult = {
        coords,
        distanceM: leg?.distanceM ?? 0,
        durationS: leg?.durationS ?? 0,
      };
      directionsCache.set(cacheKey, result);
      return result;
    } catch (err: any) {
      const errDetail = err?.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : (err?.code ? `${err.message} (${err.code})` : err?.message || String(err));
      console.error(`[Goong API Error] ❌ Directions failed: ${errDetail}`);
      return null;
    }
  },
};

export default goongMapService;
