/**
 * mockStore.ts — "Database" giả nằm trong RAM cho service mock.
 * Giúp createTrip → getTrips thấy trip mới trong cùng phiên chạy.
 * 🚨 Xoá khi backend xong.
 */
import type { Trip } from '../types';
import { MOCK_TRIPS } from './mockData';

export const mockDb = {
  trips: [...MOCK_TRIPS] as Trip[],
};

/** Giả lập độ trễ mạng. */
export const delay = (ms = 600) => new Promise<void>((r) => setTimeout(r, ms));
