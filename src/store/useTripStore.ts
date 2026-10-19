import { create } from 'zustand';
import tripService from '../services/api/tripService';
import { registerOnForceLogout } from '../services/api';
import type { CreateTripPayload, Trip } from '../types';

export interface TripState {
  trips: Trip[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  /** ID trip đang diễn ra (ACTIVE / STAY) lấy trực tiếp từ Backend */
  activeTripId: string | null;
  /** Danh sách ID các trip đã hoàn thành (COMPLETED) lấy trực tiếp từ Backend */
  completedTripIds: string[];
  /** Trip vừa tạo / đang xem (dùng truyền sang TeamRoster, LiveTracking) */
  currentTripId: string | null;
  /** Bản nháp wizard CreateTrip (giữ khi back / thoát giữa chừng) */
  draft: Partial<CreateTripPayload>;

  fetchTrips: () => Promise<void>;
  getTripById: (id: string) => Promise<Trip | undefined>;
  createTrip: (payload: CreateTripPayload) => Promise<Trip>;
  leaveTrip: (id: string) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  setCurrentTrip: (id: string | null) => void;
  updateDraft: (patch: Partial<CreateTripPayload>) => void;
  clearDraft: () => void;
  startTrip: (id: string) => Promise<void>;
  completeTrip: (id: string) => Promise<void>;
  stopTripMidway: (id: string) => Promise<void>;
  updateTripStatus: (id: string, status: Trip['status']) => Promise<void>;
  removeTripMember: (tripId: string, userId: string) => void;
  reset: () => void;
}

/**
 * Chuẩn hoá trạng thái từ backend về format đồng bộ:
 * - ACTIVE: chuyến đang diễn ra (hoặc stay)
 * - PLANNING: chuyến đi sắp tới (hoặc locked)
 * - COMPLETED: chuyến đã đi / hoàn thành
 */
function normalizeTripStatus(rawStatus?: string): Trip['status'] {
  const s = (rawStatus || 'PLANNING').toString().toUpperCase();
  if (s === 'ACTIVE' || s === 'STAY') return 'ACTIVE';
  if (s === 'COMPLETED') return 'COMPLETED';
  if (s === 'LOCKED') return 'LOCKED';
  if (s === 'CANCELLED') return 'CANCELLED';
  return 'PLANNING';
}

/**
 * Sắp xếp danh sách trip:
 * 1. Các chuyến có tag ACTIVE / STAY đẩy lên đầu trang chủ
 * 2. Các chuyến PLANNING / LOCKED (chuyến đi sắp tới)
 * 3. Các chuyến COMPLETED (chuyến đã đi)
 */
function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const getPriority = (status?: string) => {
      const s = normalizeTripStatus(status);
      if (s === 'ACTIVE') return 1;
      if (s === 'PLANNING' || s === 'LOCKED') return 2;
      if (s === 'COMPLETED') return 3;
      return 4;
    };

    const pA = getPriority(a.status);
    const pB = getPriority(b.status);

    if (pA !== pB) {
      return pA - pB;
    }

    // Nếu cùng là chuyến sắp tới (PLANNING): sắp theo ngày khởi hành gần nhất
    if (pA === 2) {
      const timeA = a.startAt ? new Date(a.startAt).getTime() : Infinity;
      const timeB = b.startAt ? new Date(b.startAt).getTime() : Infinity;
      return timeA - timeB;
    }

    // Nếu cùng là chuyến đã đi (COMPLETED): sắp theo chuyến mới nhất
    if (pA === 3) {
      const timeA = a.startAt ? new Date(a.startAt).getTime() : 0;
      const timeB = b.startAt ? new Date(b.startAt).getTime() : 0;
      return timeB - timeA;
    }

    return 0;
  });
}

export const useTripStore = create<TripState>()((set, get) => ({
  trips: [],
  loading: true,
  hasFetched: false,
  error: null,
  activeTripId: null,
  completedTripIds: [],
  currentTripId: null,
  draft: {},

  fetchTrips: async () => {
    set({ loading: true, error: null });
    try {
      // 1. Chỉ fetch trạng thái từ Backend, CẤM lưu/đọc Local Storage
      const rawTrips = await tripService.getTrips();

      // 2. Chuẩn hoá trạng thái từ Backend
      const mappedTrips: Trip[] = (rawTrips || []).map((t) => ({
        ...t,
        status: normalizeTripStatus(t.status),
      }));

      // 3. Sắp xếp: ACTIVE lên đầu, PLANNING ở giữa, COMPLETED ở cuối
      const sorted = sortTrips(mappedTrips);

      const activeTrip = sorted.find((t) => normalizeTripStatus(t.status) === 'ACTIVE');
      const activeTripId = activeTrip ? activeTrip.id : null;
      const completedTripIds = sorted
        .filter((t) => normalizeTripStatus(t.status) === 'COMPLETED')
        .map((t) => t.id);

      set({
        trips: sorted,
        activeTripId,
        completedTripIds,
        loading: false,
        hasFetched: true,
      });
    } catch (e: any) {
      set({
        loading: false,
        hasFetched: true,
        error: e?.response?.data?.message ?? 'Không tải được danh sách trip.',
      });
    }
  },

  getTripById: async (id: string) => {
    try {
      const trip = await tripService.getTripById(id);
      if (trip) {
        const normalizedTrip: Trip = {
          ...trip,
          status: normalizeTripStatus(trip.status),
        };

        set((s) => {
          const exists = s.trips.some((t) => t.id === id);
          const newTrips = exists
            ? s.trips.map((t) => (t.id === id ? normalizedTrip : t))
            : [normalizedTrip, ...s.trips];

          const sorted = sortTrips(newTrips);
          const activeTrip = sorted.find((t) => normalizeTripStatus(t.status) === 'ACTIVE');

          return {
            trips: sorted,
            activeTripId: activeTrip ? activeTrip.id : null,
            completedTripIds: sorted
              .filter((t) => normalizeTripStatus(t.status) === 'COMPLETED')
              .map((t) => t.id),
          };
        });

        return normalizedTrip;
      }
      return trip;
    } catch {
      return undefined;
    }
  },

  createTrip: async (payload) => {
    const trip = await tripService.createTrip(payload);
    const normalizedTrip: Trip = {
      ...trip,
      status: normalizeTripStatus(trip.status),
    };
    set((s) => {
      const sorted = sortTrips([normalizedTrip, ...s.trips]);
      return {
        trips: sorted,
        currentTripId: trip.id,
        draft: {},
      };
    });
    return trip;
  },

  leaveTrip: async (id: string) => {
    await tripService.leaveTrip(id);
    set((s) => {
      const remaining = s.trips.filter((t) => t.id !== id);
      const activeTrip = remaining.find((t) => normalizeTripStatus(t.status) === 'ACTIVE');
      return {
        trips: remaining,
        currentTripId: s.currentTripId === id ? null : s.currentTripId,
        activeTripId: activeTrip ? activeTrip.id : null,
        completedTripIds: s.completedTripIds.filter((cid) => cid !== id),
      };
    });
  },

  deleteTrip: async (id: string) => {
    await tripService.deleteTrip(id);
    set((s) => {
      const remaining = s.trips.filter((t) => t.id !== id);
      const activeTrip = remaining.find((t) => normalizeTripStatus(t.status) === 'ACTIVE');
      return {
        trips: remaining,
        currentTripId: s.currentTripId === id ? null : s.currentTripId,
        activeTripId: activeTrip ? activeTrip.id : null,
        completedTripIds: s.completedTripIds.filter((cid) => cid !== id),
      };
    });
  },

  setCurrentTrip: (id) => set({ currentTripId: id }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clearDraft: () => set({ draft: {} }),

  startTrip: async (id: string) => {
    // Ràng buộc quy định: Mỗi thời điểm chỉ được phép CÓ DUY NHẤT 1 chuyến đi đang hoạt động
    const currentTrips = get().trips;
    const existingActive = currentTrips.find(
      (t) => (normalizeTripStatus(t.status) === 'ACTIVE' || normalizeTripStatus(t.status) === 'STAY') && t.id !== id
    );
    if (existingActive) {
      throw new Error(
        `Bạn đang có chuyến đi "${existingActive.name}" đang diễn ra. Mỗi thời điểm chỉ được phép có 1 chuyến đi hoạt động. Vui lòng hoàn thành chuyến đi đó trước khi bắt đầu chuyến mới!`
      );
    }

    // Gọi API Backend để bắt đầu chuyến đi
    await tripService.startTrip(id);

    // Cập nhật in-memory state ngay lập tức, hoàn toàn không lưu AsyncStorage
    set((s) => {
      const updated = s.trips.map((t) =>
        t.id === id ? { ...t, status: 'ACTIVE' as const } : t
      );
      const sorted = sortTrips(updated);
      return {
        trips: sorted,
        activeTripId: id,
        completedTripIds: s.completedTripIds.filter((cid) => cid !== id),
      };
    });
  },

  completeTrip: async (id: string) => {
    // Gọi API Backend để hoàn tất chuyến đi
    try {
      await tripService.completeTrip(id);
    } catch (apiErr) {
      console.warn('[useTripStore] completeTrip API error:', apiErr);
    }

    // Cập nhật in-memory state ngay lập tức, hoàn toàn không lưu AsyncStorage
    set((s) => {
      const updated = s.trips.map((t) =>
        t.id === id ? { ...t, status: 'COMPLETED' as const } : t
      );
      const sorted = sortTrips(updated);
      const activeTrip = sorted.find((t) => normalizeTripStatus(t.status) === 'ACTIVE');
      return {
        trips: sorted,
        activeTripId: activeTrip ? activeTrip.id : null,
        completedTripIds: Array.from(new Set([...s.completedTripIds, id])),
      };
    });
  },

  stopTripMidway: async (id: string) => {
    await get().completeTrip(id);
  },

  updateTripStatus: async (id: string, status: Trip['status']) => {
    const norm = normalizeTripStatus(status);
    if (norm === 'ACTIVE') {
      await get().startTrip(id);
    } else if (norm === 'COMPLETED') {
      await get().completeTrip(id);
    } else {
      set((s) => {
        const updated = s.trips.map((t) => (t.id === id ? { ...t, status: norm } : t));
        return { trips: sortTrips(updated) };
      });
    }
  },

  removeTripMember: (tripId, userId) =>
    set({
      trips: get().trips.map((t) => {
        if (t.id !== tripId) return t;
        const newMembers = (t.members || []).filter((m) => m.userId !== userId);
        return {
          ...t,
          members: newMembers,
          currentMembers: newMembers.length,
        };
      }),
    }),

  reset: () =>
    set({
      trips: [],
      currentTripId: null,
      draft: {},
      error: null,
      loading: false,
      hasFetched: false,
      activeTripId: null,
      completedTripIds: [],
    }),
}));

// Tự động reset store khi phiên đăng nhập bị thu hồi (tránh require cycle)
registerOnForceLogout(() => useTripStore.getState().reset());

/** Selector tiện dụng */
export const selectUpcomingTrips = (s: TripState) =>
  s.trips.filter((t) => {
    const st = normalizeTripStatus(t.status);
    return st === 'PLANNING' || st === 'LOCKED';
  });

export const selectActiveTrip = (s: TripState) =>
  s.trips.find((t) => {
    const st = normalizeTripStatus(t.status);
    return st === 'ACTIVE';
  });

export const selectPastTrips = (s: TripState) =>
  s.trips.filter((t) => {
    const st = normalizeTripStatus(t.status);
    return st === 'COMPLETED';
  });

