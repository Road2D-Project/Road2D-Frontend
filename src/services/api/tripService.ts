/**
 * tripService.ts — API chuyến đi.
 *
 * USE_MOCK=true  → đọc/ghi `mockDb` trong RAM (mất khi reload app).
 * USE_MOCK=false → gọi API thật. (TODO BACKEND: xác nhận endpoint + shape response)
 */
import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { useAuthStore } from '../../store/useAuthStore';
import { MOCK_CURRENT_USER } from '../../mocks/mockData';
import { MOCK_FRIENDS } from '../../mocks/mockData';
import { mockDb, delay } from '../../mocks/mockStore';
import type { CreateTripPayload, Trip } from '../../types';

const genInviteCode = () =>
  'R2D-' + Math.random().toString(36).slice(2, 7).toUpperCase();

function mapBackendTripToFrontend(b: any): Trip {
  return {
    id: b.id,
    name: b.name,
    routeId: b.id,
    routeName: b.name,
    distanceKm: Math.round((b.totalDistance || 0) / 1000) || b.totalDistance || 0,
    status: (b.status?.toUpperCase() || 'PLANNING') as any,
    startAt: b.startTime || b.createdTime || new Date().toISOString(),
    vehicle: 'Xe máy',
    maxMembers: b.memberLimit || 15,
    isPublic: !!b.visibility,
    note: b.note || '',
    inviteCode: '',
    leaderId: b.ownerId,
    members: [],
  };
}

const tripService = {
  /** GET /trips */
  getTrips: async (): Promise<Trip[]> => {
    if (USE_MOCK) {
      await delay(500);
      return [...mockDb.trips];
    }
    try {
      // GET /v1/trips -> trả về { trips: TripResponse[] }
      const res = await apiClient.get<any>('/trips');
      console.log('[Trip API] 📡 GET /v1/trips response:', res.data);
      const list = Array.isArray(res.data) ? res.data : (res.data?.trips ?? []);
      return list.map(mapBackendTripToFrontend);
    } catch (err: any) {
      console.error('[Trip API Error] ❌ GET /v1/trips failed:', err?.response?.status, err?.response?.data || err?.message);
      throw err;
    }
  },

  /** GET /trips/:id */
  getTripById: async (id: string): Promise<Trip | undefined> => {
    if (USE_MOCK) {
      await delay(300);
      return mockDb.trips.find((t) => t.id === id);
    }
    // GET /v1/trips/:tripId
    const res = await apiClient.get<any>(`/trips/${id}`);
    const trip = mapBackendTripToFrontend(res.data);
    try {
      const membersRes = await apiClient.get<any>(`/trips/${id}/members`);
      const membersList = Array.isArray(membersRes.data)
        ? membersRes.data
        : (membersRes.data?.members ?? []);
      if (Array.isArray(membersList)) {
        trip.members = membersList.map((m: any) => ({
          userId: m.userId,
          name: m.nickname ?? m.username ?? m.name ?? m.userId,
          avatar: m.avatar ?? '',
          role: (m.role?.toUpperCase() || 'RIDER') as any,
          nickname: m.nickname,
          status: m.status,
          accepted: m.status === 'active' || m.membershipStatus === 'active',
        }));
      }
    } catch {
      // Bỏ qua nếu không lấy được members
    }
    return trip;
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
    // POST /v1/trips (CreateTripRequest)
    const validUuidIds = payload.invitedUserIds?.filter((id) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) || [];
    const currentUserId = useAuthStore.getState().user?.id;
    const isCurrentUuid = currentUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUserId);
    const memberUserIds = validUuidIds.length > 0 
      ? validUuidIds 
      : (isCurrentUuid ? [currentUserId] : []);

    const bePayload: any = {
      name: payload.name,
      note: payload.note || '',
      tripType: payload.tripType || 'bronze',
      visibility: !!payload.isPublic,
      memberUserIds: memberUserIds.length > 0 ? memberUserIds : undefined,
    };
    if (payload.startAt) {
      try {
        bePayload.startTime = new Date(payload.startAt).toISOString();
      } catch {
        // Fallback
      }
    }

    const res = await apiClient.post<any>('/trips', bePayload);
    const trip = mapBackendTripToFrontend(res.data);

    // Lấy invite link token qua POST /v1/trips/:tripId/invite-link
    try {
      const linkRes = await apiClient.post<any>(`/trips/${res.data.id}/invite-link`);
      if (linkRes.data?.token) {
        trip.inviteCode = linkRes.data.token;
      }
    } catch {
      trip.inviteCode = genInviteCode();
    }

    return trip;
  },

  /** POST /trips/join/:token */
  joinTrip: async (inviteCode: string): Promise<Trip> => {
    if (USE_MOCK) {
      await delay(700);
      const trip = mockDb.trips.find((t) => t.inviteCode === inviteCode.trim().toUpperCase());
      if (!trip) throw { response: { status: 404, data: { message: 'Mã mời không tồn tại.' } } };
      return trip;
    }
    const token = inviteCode.includes('/') ? inviteCode.split('/').pop()! : inviteCode.trim();
    const res = await apiClient.post<any>(`/trips/join/${token}`);
    return mapBackendTripToFrontend(res.data);
  },

  /** POST /trips/:id/leave */
  leaveTrip: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      await delay(400);
      mockDb.trips = mockDb.trips.filter((t) => t.id !== id);
      return;
    }
    await apiClient.post(`/trips/${id}/leave`);
  },
};

export default tripService;
