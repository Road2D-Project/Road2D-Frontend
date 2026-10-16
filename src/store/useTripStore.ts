import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tripService from '../services/api/tripService';
import { registerOnForceLogout } from '../services/api';
import type { CreateTripPayload, Trip } from '../types';

const STORAGE_ACTIVE_TRIP_KEY = '@road2d_active_trip_id';
const STORAGE_COMPLETED_TRIPS_KEY = '@road2d_completed_trip_ids';

export interface TripState {
  trips: Trip[];
  loading: boolean;
  hasFetched: boolean;
  error: string | null;
  /** ID trip đang diễn ra (ACTIVE) lưu trong Local Storage */
  activeTripId: string | null;
  /** Danh sách ID các trip đã hoàn thành (COMPLETED) lưu trong Local Storage */
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
      // 1. Tải trạng thái active & completed từ AsyncStorage
      let storedActiveId: string | null = null;
      let storedCompletedIds: string[] = [];
      try {
        storedActiveId = await AsyncStorage.getItem(STORAGE_ACTIVE_TRIP_KEY);
        const compRaw = await AsyncStorage.getItem(STORAGE_COMPLETED_TRIPS_KEY);
        if (compRaw) {
          storedCompletedIds = JSON.parse(compRaw);
        }
      } catch (storageErr) {
        console.warn('Lỗi đọc local storage trip status:', storageErr);
      }

      // 2. Tải danh sách trip từ Backend
      const rawTrips = await tripService.getTrips();
      const now = Date.now();

      // 3. Ánh xạ trạng thái dựa trên Local Storage & thời gian khởi hành tự động
      let resolvedActiveId = storedActiveId;

      const mappedTrips = rawTrips.map((t) => {
        // Nếu Backend đã có status COMPLETED hoặc Local Storage đã lưu completed
        if (t.status === 'COMPLETED' || (t.status as string) === 'completed' || storedCompletedIds.includes(t.id)) {
          if (!storedCompletedIds.includes(t.id)) {
            storedCompletedIds.push(t.id);
          }
          return { ...t, status: 'COMPLETED' as const };
        }

        // Nếu Backend đã có status ACTIVE hoặc STAY
        if (t.status === 'ACTIVE' || (t.status as string) === 'active' || t.status === 'STAY' || (t.status as string) === 'stay') {
          if (!resolvedActiveId) {
            resolvedActiveId = t.id;
          }
          return { ...t, status: 'ACTIVE' as const };
        }

        // Nếu đang active từ trước trong Local Storage
        if (resolvedActiveId === t.id) {
          return { ...t, status: 'ACTIVE' as const };
        }

        // Tự động kích hoạt khi đến giờ khởi hành (startAt <= now) nếu chưa có trip active khác
        const startTimestamp = t.startAt ? new Date(t.startAt).getTime() : NaN;
        if (!isNaN(startTimestamp) && startTimestamp <= now) {
          if (!resolvedActiveId) {
            resolvedActiveId = t.id;
          }
          if (resolvedActiveId === t.id) {
            return { ...t, status: 'ACTIVE' as const };
          }
        }

        return t;
      });

      // Lưu lại activeTripId nếu có trip tự động kích hoạt
      if (resolvedActiveId && resolvedActiveId !== storedActiveId) {
        AsyncStorage.setItem(STORAGE_ACTIVE_TRIP_KEY, resolvedActiveId).catch(() => {});
      }

      set({
        trips: mappedTrips,
        activeTripId: resolvedActiveId,
        completedTripIds: storedCompletedIds,
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
        const { activeTripId, completedTripIds } = get();
        let resolvedStatus = trip.status;
        if (completedTripIds.includes(trip.id)) {
          resolvedStatus = 'COMPLETED';
        } else if (activeTripId === trip.id) {
          resolvedStatus = 'ACTIVE';
        } else if (trip.startAt && new Date(trip.startAt).getTime() <= Date.now()) {
          resolvedStatus = 'ACTIVE';
        }
        const updatedTrip = { ...trip, status: resolvedStatus };

        set((s) => ({
          trips: s.trips.some((t) => t.id === id)
            ? s.trips.map((t) => (t.id === id ? updatedTrip : t))
            : [updatedTrip, ...s.trips],
        }));
        return updatedTrip;
      }
      return trip;
    } catch {
      return undefined;
    }
  },

  createTrip: async (payload) => {
    const trip = await tripService.createTrip(payload);
    set((s) => ({ trips: [trip, ...s.trips], currentTripId: trip.id, draft: {} }));
    return trip;
  },

  leaveTrip: async (id: string) => {
    await tripService.leaveTrip(id);
    const { activeTripId, completedTripIds } = get();
    if (activeTripId === id) {
      await AsyncStorage.removeItem(STORAGE_ACTIVE_TRIP_KEY);
    }
    set((s) => ({
      trips: s.trips.filter((t) => t.id !== id),
      currentTripId: s.currentTripId === id ? null : s.currentTripId,
      activeTripId: s.activeTripId === id ? null : s.activeTripId,
      completedTripIds: completedTripIds.filter((cid) => cid !== id),
    }));
  },

  deleteTrip: async (id: string) => {
    await tripService.deleteTrip(id);
    const { activeTripId, completedTripIds } = get();
    if (activeTripId === id) {
      await AsyncStorage.removeItem(STORAGE_ACTIVE_TRIP_KEY);
    }
    const newComp = completedTripIds.filter((cid) => cid !== id);
    await AsyncStorage.setItem(STORAGE_COMPLETED_TRIPS_KEY, JSON.stringify(newComp));
    set((s) => ({
      trips: s.trips.filter((t) => t.id !== id),
      currentTripId: s.currentTripId === id ? null : s.currentTripId,
      activeTripId: s.activeTripId === id ? null : s.activeTripId,
      completedTripIds: newComp,
    }));
  },

  setCurrentTrip: (id) => set({ currentTripId: id }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clearDraft: () => set({ draft: {} }),

  startTrip: async (id: string) => {
    try {
      // 1. Gọi API Backend để kích hoạt chuyến đi thật (Leader: PATCH /v1/trips/:id/active)
      await tripService.startTrip(id);
    } catch (apiErr) {
      console.warn('[useTripStore] startTrip API error, proceeding with local sync:', apiErr);
      // Ném lỗi để caller (TripDetailsScreen) biết nếu có lỗi phân quyền
      throw apiErr;
    }

    try {
      // 2. Đồng bộ Local Storage & Zustand Store
      await AsyncStorage.setItem(STORAGE_ACTIVE_TRIP_KEY, id);
      const newCompleted = get().completedTripIds.filter((cid) => cid !== id);
      await AsyncStorage.setItem(STORAGE_COMPLETED_TRIPS_KEY, JSON.stringify(newCompleted));
      set((s) => ({
        activeTripId: id,
        completedTripIds: newCompleted,
        trips: s.trips.map((t) => (t.id === id ? { ...t, status: 'ACTIVE' } : t)),
      }));
    } catch (storageErr) {
      console.warn('Lỗi lưu startTrip vào local storage:', storageErr);
    }
  },

  completeTrip: async (id: string) => {
    try {
      // 1. Gọi API Backend để hoàn tất chuyến đi thật (Leader: POST /v1/trips/:id/complete)
      await tripService.completeTrip(id);
    } catch (apiErr) {
      console.warn('[useTripStore] completeTrip API error, proceeding with local sync:', apiErr);
    }

    try {
      // 2. Đồng bộ Local Storage & Zustand Store
      const prevActive = get().activeTripId;
      if (prevActive === id) {
        await AsyncStorage.removeItem(STORAGE_ACTIVE_TRIP_KEY);
      }
      const newCompleted = Array.from(new Set([...get().completedTripIds, id]));
      await AsyncStorage.setItem(STORAGE_COMPLETED_TRIPS_KEY, JSON.stringify(newCompleted));
      set((s) => ({
        activeTripId: prevActive === id ? null : prevActive,
        completedTripIds: newCompleted,
        trips: s.trips.map((t) => (t.id === id ? { ...t, status: 'COMPLETED' } : t)),
      }));
    } catch (storageErr) {
      console.warn('Lỗi lưu completeTrip vào local storage:', storageErr);
    }
  },

  stopTripMidway: async (id: string) => {
    // Dừng giữa chừng cũng chuyển trạng thái sang COMPLETED và đưa vào danh sách trip đã đi
    await get().completeTrip(id);
  },

  updateTripStatus: async (id: string, status: Trip['status']) => {
    if (status === 'ACTIVE') {
      await get().startTrip(id);
    } else if (status === 'COMPLETED') {
      await get().completeTrip(id);
    } else {
      set((s) => ({
        trips: s.trips.map((t) => (t.id === id ? { ...t, status } : t)),
      }));
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
  s.trips.filter(
    (t) =>
      t.status !== 'COMPLETED' &&
      !s.completedTripIds.includes(t.id) &&
      t.id !== s.activeTripId &&
      t.status !== 'ACTIVE'
  );

export const selectActiveTrip = (s: TripState) =>
  s.trips.find(
    (t) =>
      (t.id === s.activeTripId || t.status === 'ACTIVE' || (t.status as string) === 'active') &&
      !s.completedTripIds.includes(t.id) &&
      t.status !== 'COMPLETED'
  );

export const selectPastTrips = (s: TripState) =>
  s.trips.filter(
    (t) => t.status === 'COMPLETED' || s.completedTripIds.includes(t.id)
  );
