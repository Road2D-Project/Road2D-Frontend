/**
 * routeService.ts — API tuyến đường.
 *
 * USE_MOCK=true  → trả MOCK_ROUTES.
 * USE_MOCK=false → gọi API thật. (TODO BACKEND: xác nhận endpoint + shape response)
 */
import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { MOCK_ROUTES } from '../../mocks/mockData';
import { delay } from '../../mocks/mockStore';
import type { Route } from '../../types';

function mapPublicTripToRoute(t: any): Route {
  return {
    id: t.id,
    name: t.name,
    distanceKm: Math.round((t.totalDistance || 0) / 1000) || t.totalDistance || 50,
    difficulty: 'MEDIUM',
    coverImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?q=80&w=600',
    stopovers: [],
    polyline: [],
  };
}

const routeService = {
  /** GET /routes (Backend: GET /v1/trips/public) */
  getRoutes: async (): Promise<Route[]> => {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_ROUTES;
    }
    try {
      const res = await apiClient.get<any>('/trips/public');
      const list = Array.isArray(res.data) ? res.data : (res.data?.trips ?? []);
      if (list.length > 0) {
        return list.map(mapPublicTripToRoute);
      }
    } catch {
      // Fallback nếu server chưa có dữ liệu công khai
    }
    return MOCK_ROUTES;
  },

  /** GET /routes/:id (Backend: GET /v1/trips/:id) */
  getRouteById: async (id: string): Promise<Route | undefined> => {
    if (USE_MOCK) {
      await delay(300);
      return MOCK_ROUTES.find((r) => r.id === id);
    }
    try {
      const res = await apiClient.get<any>(`/trips/${id}`);
      if (res.data) {
        return mapPublicTripToRoute(res.data);
      }
    } catch {
      // Fallback
    }
    return MOCK_ROUTES.find((r) => r.id === id);
  },

  /** GET /routes?q= (Backend filter trên /v1/trips/public) */
  searchRoutes: async (query: string): Promise<Route[]> => {
    const all = await routeService.getRoutes();
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((r) => r.name.toLowerCase().includes(q));
  },
};

export default routeService;
