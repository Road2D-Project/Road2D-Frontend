/**
 * useTripStore.ts — Danh sách trip, trip đang chọn và bản nháp wizard tạo trip.
 * Dữ liệu lấy qua `tripService` (hiện là mock; backend xong chỉ cần đổi USE_MOCK).
 */
import { create } from 'zustand';
import tripService from '../services/api/tripService';
import type { CreateTripPayload, Trip } from '../types';

export interface TripState {
  trips: Trip[];
  loading: boolean;
  error: string | null;
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
  updateTripStatus: (id: string, status: Trip['status']) => void;
  reset: () => void;
}

export const useTripStore = create<TripState>()((set, get) => ({
  trips: [],
  loading: false,
  error: null,
  currentTripId: null,
  draft: {},

  fetchTrips: async () => {
    set({ loading: true, error: null });
    try {
      const trips = await tripService.getTrips();
      set({ trips, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.response?.data?.message ?? 'Không tải được danh sách trip.' });
    }
  },

  getTripById: async (id: string) => {
    try {
      const trip = await tripService.getTripById(id);
      if (trip) {
        set((s) => ({
          trips: s.trips.some((t) => t.id === id)
            ? s.trips.map((t) => (t.id === id ? trip : t))
            : [trip, ...s.trips],
        }));
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
    set((s) => ({
      trips: s.trips.filter((t) => t.id !== id),
      currentTripId: s.currentTripId === id ? null : s.currentTripId,
    }));
  },

  deleteTrip: async (id: string) => {
    await tripService.deleteTrip(id);
    set((s) => ({
      trips: s.trips.filter((t) => t.id !== id),
      currentTripId: s.currentTripId === id ? null : s.currentTripId,
    }));
  },

  setCurrentTrip: (id) => set({ currentTripId: id }),
  updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  clearDraft: () => set({ draft: {} }),
  updateTripStatus: (id, status) =>
    set({ trips: get().trips.map((t) => (t.id === id ? { ...t, status } : t)) }),
  reset: () => set({ trips: [], currentTripId: null, draft: {}, error: null }),
}));

/** Selector tiện dụng. */
export const selectUpcomingTrips = (s: TripState) =>
  s.trips.filter((t) => t.status === 'PLANNING' || (t.status as string) === 'planning');
export const selectActiveTrip = (s: TripState) =>
  s.trips.find(
    (t) =>
      t.status === 'ACTIVE' ||
      (t.status as string) === 'active' ||
      t.status === 'LOCKED' ||
      (t.status as string) === 'locked'
  );
