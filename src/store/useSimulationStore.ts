/**
 * useSimulationStore.ts — State của phiên giả lập chuyến đi.
 * Mới là khung dữ liệu; engine tick vị trí sẽ viết ở task Simulation (ghi vào store này).
 */
import { create } from 'zustand';
import type { LatLng, SimSpeed, SimulationState, TripEvent } from '../types';

interface SimulationActions {
  start: (tripId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeedMultiplier: (s: SimSpeed) => void;
  tick: (data: { traveledKm: number; position: LatLng; speedKmh: number }) => void;
  pushEvent: (e: TripEvent) => void;
}

const initial: SimulationState = {
  tripId: null,
  running: false,
  speedMultiplier: 1,
  traveledKm: 0,
  currentPosition: null,
  currentSpeedKmh: 0,
  events: [],
};

export const useSimulationStore = create<SimulationState & SimulationActions>()((set) => ({
  ...initial,
  start: (tripId) => set({ ...initial, tripId, running: true }),
  pause: () => set({ running: false }),
  resume: () => set({ running: true }),
  stop: () => set({ ...initial }),
  setSpeedMultiplier: (speedMultiplier) => set({ speedMultiplier }),
  tick: ({ traveledKm, position, speedKmh }) =>
    set({ traveledKm, currentPosition: position, currentSpeedKmh: speedKmh }),
  pushEvent: (e) => set((s) => ({ events: [...s.events, e] })),
}));
