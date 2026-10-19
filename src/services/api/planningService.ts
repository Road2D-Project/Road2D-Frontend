/**
 * planningService.ts — Quản lý các endpoint quy hoạch lộ trình và xem trước đường đi.
 * Backend: POST /v1/planning/location, POST /v1/planning/preview
 */
import apiClient from './index';
import { decodePolyline } from './goongMapService';
import { USE_MOCK } from '../../config/env';

export interface EnsureLocationResponse {
  locationId: string;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
}

export interface PreviewBranchStop {
  name: string;
  destinationId?: string;
  locationId?: string;
  stayOverTime: number;
}

export interface PreviewBranchLeg {
  from: PreviewBranchStop;
  to: PreviewBranchStop;
  vehicle: string;
  polyline: string;
  distanceM: number;
  durationS: number;
}

export interface PreviewLocationsResponse {
  locations: Array<{
    locationId: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  legs: PreviewBranchLeg[];
}

export interface RoutePreviewSummary {
  locations: PreviewLocationsResponse['locations'];
  legs: PreviewBranchLeg[];
  totalDistanceM: number;
  totalDurationS: number;
  distanceFormatted: string;
  durationFormatted: string;
  polylineCoords: [number, number][]; // [[lng, lat], ...]
  raw: PreviewLocationsResponse;
}

function fmtDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h} giờ ${rem} phút` : `${h} giờ`;
}

const planningService = {
  /**
   * Lưu hoặc lấy locationId từ catalog cho một Goong place_id
   * POST /v1/planning/location
   */
  ensureLocation: async (placeId: string): Promise<EnsureLocationResponse> => {
    if (USE_MOCK) {
      return {
        locationId: 'loc-mock-' + (placeId ? placeId.slice(0, 8) : 'rnd'),
        placeId,
        name: 'Địa điểm mô phỏng',
        lat: 21.0285,
        lng: 105.8542,
      };
    }
    const res = await apiClient.post<EnsureLocationResponse>('/planning/location', { placeId });
    return res.data;
  },

  /**
   * Tạo destination từ locationId
   * POST /v1/planning/fork/:locationId
   */
  forkLocation: async (
    locationId: string,
    data: { name?: string; stayOverTime?: number } = {}
  ): Promise<{ destinationId: string }> => {
    if (USE_MOCK) {
      return { destinationId: 'dest-mock-' + Date.now() };
    }
    const res = await apiClient.post<{ destinationId: string }>(`/planning/fork/${locationId}`, {
      name: data.name || '',
      stayOverTime: data.stayOverTime ?? 0,
    });
    return res.data;
  },

  /**
   * Xem trước đường đi theo danh sách ordered locationId
   * POST /v1/planning/preview (hoặc fallback /planning/review)
   */
  previewLocations: async (locationIds: string[]): Promise<PreviewLocationsResponse> => {
    try {
      const res = await apiClient.post<PreviewLocationsResponse>('/planning/preview', { locationIds });
      return res.data;
    } catch (err: any) {
      // Fallback nếu server đặt alias review
      if (err?.response?.status === 404) {
        const res = await apiClient.post<PreviewLocationsResponse>('/planning/review', { locationIds });
        return res.data;
      }
      throw err;
    }
  },

  /**
   * Hàm tiện ích cấp cao: Nhận danh sách điểm (xuất phát, các trạm, điểm đến),
   * tự động resolve locationId qua ensureLocation rồi gọi previewLocations.
   */
  previewRouteFromWaypoints: async (
    waypoints: Array<{ place_id?: string; name: string; lat: number; lng: number }>
  ): Promise<RoutePreviewSummary> => {
    if (waypoints.length < 2) {
      throw new Error('Cần ít nhất 2 điểm để xem trước đường đi.');
    }

    // 1. Resolve từng placeId sang catalog locationId
    const locationIds: string[] = [];
    for (const wp of waypoints) {
      if (!wp.place_id) {
        throw new Error(`Điểm "${wp.name}" chưa có mã địa điểm hợp lệ.`);
      }
      const loc = await planningService.ensureLocation(wp.place_id);
      locationIds.push(loc.locationId);
    }

    // 2. Gọi API preview locations
    const previewData = await planningService.previewLocations(locationIds);

    // 3. Tính toán thông số lộ trình & giải mã polyline
    const legs = previewData.legs || [];
    const totalDistanceM = legs.reduce((acc, leg) => acc + (leg.distanceM || 0), 0);
    const totalDurationS = legs.reduce((acc, leg) => acc + (leg.durationS || 0), 0);

    const polylineCoords: [number, number][] = legs.flatMap((leg) =>
      leg.polyline ? decodePolyline(leg.polyline) : []
    );

    return {
      locations: previewData.locations || [],
      legs,
      totalDistanceM,
      totalDurationS,
      distanceFormatted: fmtDistance(totalDistanceM),
      durationFormatted: fmtDuration(totalDurationS),
      polylineCoords,
      raw: previewData,
    };
  },
};

export default planningService;
