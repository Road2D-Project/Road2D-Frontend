/**
 * tripService.ts — API chuyến đi.
 *
 * USE_MOCK=true  → đọc/ghi `mockDb` trong RAM (mất khi reload app).
 * USE_MOCK=false → gọi API thật. (TODO BACKEND: xác nhận endpoint + shape response)
 */
import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { MOCK_CURRENT_USER } from '../../mocks/mockData';
import { MOCK_FRIENDS } from '../../mocks/mockData';
import { mockDb, delay } from '../../mocks/mockStore';
import type { CreateTripPayload, Trip } from '../../types';

const genInviteCode = () =>
  'R2D-' + Math.random().toString(36).slice(2, 7).toUpperCase();

const tripService = {
  /** GET /trips */
  getTrips: async (): Promise<Trip[]> => {
    if (USE_MOCK) {
      await delay(500);
      return [...mockDb.trips];
    }
    // TODO BACKEND: GET /trips
    const res = await apiClient.get<Trip[]>('/trips');
    return res.data;
  },

  /** GET /trips/:id */
  getTripById: async (id: string): Promise<Trip | undefined> => {
    if (USE_MOCK) {
      await delay(300);
      return mockDb.trips.find((t) => t.id === id);
    }
    // TODO BACKEND: GET /trips/:id
    const res = await apiClient.get<Trip>(`/trips/${id}`);
    return res.data;
  },

  /** POST /trips */
  createTrip: async (payload: CreateTripPayload): Promise<Trip> => {
    if (USE_MOCK) {
      await delay(900);
      const invited = MOCK_FRIENDS.filter((f) => payload.invitedUserIds.includes(f.id));
      const { invitedUserIds: _ignored, ...tripFields } = payload;
      const trip: Trip = {
        ...tripFields,
        id: 'trip_' + Date.now(),
        status: 'PLANNING',
        inviteCode: genInviteCode(),
        leaderId: MOCK_CURRENT_USER.id,
        members: [
          {
            userId: MOCK_CURRENT_USER.id,
            name: MOCK_CURRENT_USER.name,
            avatar: MOCK_CURRENT_USER.avatar ?? '',
            role: 'LEADER',
            accepted: true,
          },
          ...invited.map((f) => ({
            userId: f.id,
            name: f.name,
            avatar: f.avatar,
            role: 'RIDER' as const,
            accepted: false,
          })),
        ],
      };
      mockDb.trips.unshift(trip);
      return trip;
    }
    // TODO BACKEND: POST /trips
    const res = await apiClient.post<Trip>('/trips', payload);
    return res.data;
  },

  /** POST /trips/join  { inviteCode } */
  joinTrip: async (inviteCode: string): Promise<Trip> => {
    if (USE_MOCK) {
      await delay(700);
      const trip = mockDb.trips.find((t) => t.inviteCode === inviteCode.trim().toUpperCase());
      if (!trip) throw { response: { status: 404, data: { message: 'Mã mời không tồn tại.' } } };
      return trip;
    }
    // TODO BACKEND: POST /trips/join
    const res = await apiClient.post<Trip>('/trips/join', { inviteCode });
    return res.data;
  },

  /** POST /trips/:id/leave */
  leaveTrip: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      await delay(400);
      mockDb.trips = mockDb.trips.filter((t) => t.id !== id);
      return;
    }
    // TODO BACKEND: POST /trips/:id/leave
    await apiClient.post(`/trips/${id}/leave`);
  },
};

export default tripService;
