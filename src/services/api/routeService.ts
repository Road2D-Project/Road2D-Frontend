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

const routeService = {
  /** GET /routes */
  getRoutes: async (): Promise<Route[]> => {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_ROUTES;
    }
    // TODO BACKEND: GET /routes
    const res = await apiClient.get<Route[]>('/routes');
    return res.data;
  },

  /** GET /routes/:id */
  getRouteById: async (id: string): Promise<Route | undefined> => {
    if (USE_MOCK) {
      await delay(300);
      return MOCK_ROUTES.find((r) => r.id === id);
    }
    // TODO BACKEND: GET /routes/:id
    const res = await apiClient.get<Route>(`/routes/${id}`);
    return res.data;
  },

  /** GET /routes?q= */
  searchRoutes: async (query: string): Promise<Route[]> => {
    if (USE_MOCK) {
      await delay(300);
      const q = query.trim().toLowerCase();
      return MOCK_ROUTES.filter((r) => r.name.toLowerCase().includes(q));
    }
    // TODO BACKEND: GET /routes?q=
    const res = await apiClient.get<Route[]>('/routes', { params: { q: query } });
    return res.data;
  },
};

export default routeService;
