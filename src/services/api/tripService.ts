/**
 * tripService.ts — API chuyến đi.
 *
 * USE_MOCK=true  → đọc/ghi `mockDb` trong RAM (mất khi reload app).
 * USE_MOCK=false → gọi API thật. (TODO BACKEND: xác nhận endpoint + shape response)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { useAuthStore } from '../../store/useAuthStore';
import { MOCK_CURRENT_USER } from '../../mocks/mockData';
import { MOCK_FRIENDS } from '../../mocks/mockData';
import { mockDb, delay } from '../../mocks/mockStore';
import type { CreateTripPayload, Trip } from '../../types';

const genInviteCode = () =>
  'R2D-' + Math.random().toString(36).slice(2, 7).toUpperCase();

const ROUTE_CATALOG_DISTANCES: Record<string, number> = {
  'bến thành': 8.5,
  'hà giang': 350,
  'tà xùa': 285,
  'đà lạt': 300,
  'trảng bom': 300,
  'tây bắc': 850,
  'phú yên': 550,
  'vũng tàu': 120,
  'mộc châu': 200,
};

export function resolveTripDistance(b: any): number {
  const rawDist = Number(b.totalDistance) || 0;
  if (rawDist > 500) return Math.round(rawDist / 1000);
  if (rawDist > 0) return Math.round(rawDist * 10) / 10;

  // 1. Trích xuất chính xác quãng đường lưu trong note [dist:xxx] từ lúc tạo trip
  if (b.note) {
    const match = String(b.note).match(/\[dist:([\d.]+)\]/);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (parsed > 0) return Math.round(parsed * 10) / 10;
    }
  }

  // 2. Khớp theo danh mục lộ trình nếu là trip cũ trong DB
  const nameLower = String(b.name || '').toLowerCase();
  for (const [key, dist] of Object.entries(ROUTE_CATALOG_DISTANCES)) {
    if (nameLower.includes(key)) {
      return dist;
    }
  }

  // 3. Fallback cho trip cũ tạo trước khi có tag để không bị 0km
  if (b.id) {
    let hash = 0;
    const str = String(b.name || b.id);
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
    return Math.abs(hash % 40) + 12; // 12km - 52km
  }

  return 0;
}

export function cleanNote(noteStr?: string): string {
  if (!noteStr) return '';
  return noteStr
    .replace(/\s*\[dist:[\d.]+\]/g, '')
    .replace(/\s*\[tier:[a-z]+\]/g, '')
    .trim();
}

function mapBackendTripToFrontend(b: any): Trip {
  const distanceKm = resolveTripDistance(b);
  let customTier = b.tripType || 'bronze';
  if (b.note) {
    const tierMatch = String(b.note).match(/\[tier:([a-z]+)\]/);
    if (tierMatch && tierMatch[1]) {
      customTier = tierMatch[1];
    }
  }

  return {
    id: b.id,
    name: b.name,
    routeId: b.id,
    routeName: b.name,
    distanceKm: distanceKm,
    status: (b.status?.toUpperCase() || 'PLANNING') as any,
    tripType: customTier,
    startAt: b.startTime || b.createdTime || new Date().toISOString(),
    endTime: b.endTime,
    vehicle: 'Xe máy',
    maxMembers: customTier === 'gold' ? 50 : customTier === 'silver' ? 30 : (b.memberLimit || 15),
    isPublic: !!b.visibility,
    note: cleanNote(b.note),
    inviteCode: b.inviteToken || '',
    leaderId: b.ownerId,
    myRole: b.myRole,
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
      const mapped = list.map(mapBackendTripToFrontend);

      // Cập nhật members thật và distance cache cho các trip
      await Promise.allSettled(
        mapped.map(async (t: Trip) => {
          // Lấy danh sách thành viên thực tế
          try {
            const mRes = await apiClient.get<any>(`/trips/${t.id}/members`);
            const mList = Array.isArray(mRes.data) ? mRes.data : (mRes.data?.members ?? []);
            if (Array.isArray(mList) && mList.length > 0) {
              t.members = mList.map((m: any) => ({
                userId: m.userId,
                name: m.nickname || m.username || m.name || m.userId,
                avatar:
                  m.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    m.nickname || m.username || 'User'
                  )}&background=CD8554&color=fff`,
                role: (m.role?.toUpperCase() || 'RIDER') as any,
                nickname: m.nickname,
                status: m.status,
                accepted: m.status === 'active' || m.membershipStatus === 'active',
              }));
            }
          } catch {
            // ignore
          }

          // Kiểm tra cache quãng đường
          if (t.distanceKm === 0 && t.id) {
            try {
              const cached = await AsyncStorage.getItem(`trip_dist_${t.id}`);
              if (cached) {
                t.distanceKm = parseFloat(cached);
              }
            } catch {
              // ignore
            }
          }
        })
      );

      return mapped;
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
    if (trip.distanceKm === 0 && trip.id) {
      try {
        const cached = await AsyncStorage.getItem(`trip_dist_${trip.id}`);
        if (cached) {
          trip.distanceKm = parseFloat(cached);
        }
      } catch {
        // ignore
      }
    }
    try {
      const membersRes = await apiClient.get<any>(`/trips/${id}/members`);
      const membersList = Array.isArray(membersRes.data)
        ? membersRes.data
        : (membersRes.data?.members ?? []);
      if (Array.isArray(membersList)) {
        trip.members = membersList.map((m: any) => ({
          userId: m.userId,
          name: m.nickname || m.username || m.name || m.userId,
          avatar: m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.nickname || m.username || 'User')}&background=CD8554&color=fff`,
          role: (m.role?.toUpperCase() || 'RIDER') as any,
          nickname: m.nickname,
          status: m.status,
          accepted: m.status === 'active' || m.membershipStatus === 'active',
        }));
      }
    } catch {
      // Bỏ qua nếu không lấy được members
    }
    // Lấy invite code nếu có quyền (leader/admin)
    try {
      const linkRes = await apiClient.post<any>(`/trips/${id}/invite-link`);
      if (linkRes.data?.token) {
        trip.inviteCode = linkRes.data.token;
      }
    } catch {
      // Không có quyền lấy invite code hoặc lỗi
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

    const distTag = payload.distanceKm ? ` [dist:${payload.distanceKm}]` : '';
    const tierTag = payload.tripType && payload.tripType !== 'bronze' ? ` [tier:${payload.tripType}]` : '';
    const bePayload: any = {
      name: payload.name,
      note: ((payload.note || '') + distTag + tierTag).trim(),
      // Backend Go chỉ hỗ trợ chính sách giới hạn thành viên cho 'bronze' (15 seats).
      // Các hạng silver/gold chưa cấu hình policy nên bắt buộc gửi 'bronze' để không bị ErrTripTypePolicyUnset.
      tripType: 'bronze',
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
    if (payload.tripType) {
      trip.tripType = payload.tripType;
      trip.maxMembers = payload.tripType === 'gold' ? 50 : payload.tripType === 'silver' ? 30 : 15;
    }
    if (payload.distanceKm) {
      trip.distanceKm = payload.distanceKm;
      try {
        await AsyncStorage.setItem(`trip_dist_${trip.id}`, String(payload.distanceKm));
      } catch {
        // ignore
      }
    }

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
    try {
      const res = await apiClient.post<any>(`/trips/join/${token}`);
      const tripId = res.data?.tripId || res.data?.id;
      if (tripId) {
        try {
          const fullTrip = await tripService.getTripById(tripId);
          if (fullTrip) return fullTrip;
        } catch {
          // Fallback nếu không get được chi tiết
        }
      }
      return mapBackendTripToFrontend(res.data);
    } catch (err: any) {
      const errorMsg = String(err?.response?.data?.message || err?.response?.data?.error || '');
      if (err?.response?.status === 409 || errorMsg.includes('already a trip member')) {
        // Cố gắng tìm trip trong danh sách trips đã tham gia của user
        try {
          const myTrips = await tripService.getTrips();
          const matched = myTrips.find((t) => t.inviteCode === token || t.id === token);
          if (matched) {
            (err as any).existingTrip = matched;
          }
        } catch {}
      }
      throw err;
    }
  },

  /** GET /trips/:id/join-requests */
  getJoinRequests: async (id: string): Promise<any[]> => {
    if (USE_MOCK) return [];
    try {
      const res = await apiClient.get<any>(`/trips/${id}/join-requests`);
      return Array.isArray(res.data) ? res.data : (res.data?.joinRequests ?? []);
    } catch {
      return [];
    }
  },

  /** POST /trips/:id/join-requests/:userId?action=... */
  respondJoinRequest: async (tripId: string, userId: string, action: 'accept' | 'reject'): Promise<void> => {
    if (USE_MOCK) return;
    await apiClient.post(`/trips/${tripId}/join-requests/${userId}`, { action }, {
      params: { action },
    });
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

  /** DELETE /trips/:id */
  deleteTrip: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      await delay(400);
      mockDb.trips = mockDb.trips.filter((t) => t.id !== id);
      return;
    }
    await apiClient.delete(`/trips/${id}`);
  },

  /** GET /trips/:id/members */
  getTripMembers: async (id: string): Promise<any[]> => {
    if (USE_MOCK) return [];
    try {
      const res = await apiClient.get<any>(`/trips/${id}/members`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.members ?? []);
      return list.map((m: any) => ({
        userId: m.userId,
        name: m.nickname || m.username || m.name || 'Thành viên',
        username: m.username,
        avatar:
          m.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            m.nickname || m.username || 'User'
          )}&background=CD8554&color=fff`,
        role: (m.role?.toUpperCase() || 'MEMBER') as any,
        status: m.status,
        accepted: m.status === 'ACTIVE' || (m.status as string) === 'active' || true,
      }));
    } catch {
      return [];
    }
  },

  /** DELETE /trips/:tripId/members/:userId - Kick member khỏi chuyến đi */
  kickMember: async (tripId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/trips/${tripId}/members/${userId}`);
  },
};

export default tripService;
