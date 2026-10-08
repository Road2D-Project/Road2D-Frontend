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
  createTrip: (payload: CreateTripPayload) => Promise<Trip>;
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

  createTrip: async (payload) => {
    const trip = await tripService.createTrip(payload);
    set((s) => ({ trips: [trip, ...s.trips], currentTripId: trip.id, draft: {} }));
    return trip;
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
  s.trips.filter((t) => t.status === 'PLANNING');
export const selectActiveTrip = (s: TripState) =>
  s.trips.find((t) => t.status === 'ACTIVE');
