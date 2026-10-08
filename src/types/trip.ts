/**
 * trip.ts — Domain types cho Trip, thành viên, sự kiện trong chuyến đi.
 */
import type { LatLng } from './route';

export type TripStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TripRole = 'LEADER' | 'SWEEPER' | 'RIDER' | 'PILLION' | 'CAR';
export type VehicleType = 'Xe đạp' | 'Xe máy' | 'Ô tô';

/** Trạng thái thành viên khi đang đi (khớp với STATUS_COLORS của LiveTracking). */
export type MemberStatus = 'normal' | 'lost' | 'no_signal' | 'lost_and_no_signal';

export interface TripMember {
  userId: string;
  name: string;
  avatar: string;
  role: TripRole;
  /** Đã xác nhận tham gia chưa (false = đang chờ) */
  accepted: boolean;
}

export interface Trip {
  id: string;
  name: string;
  routeId: string;
  routeName: string;
  distanceKm: number;
  status: TripStatus;
  /** ISO string */
  startAt: string;
  vehicle: VehicleType;
  maxMembers: number;
  isPublic: boolean;
  note?: string;
  inviteCode: string;
  leaderId: string;
  members: TripMember[];
  coverImage?: string;
}

/** Dữ liệu form tạo trip (chưa có id/inviteCode — do service sinh ra). */
export type CreateTripPayload = Pick<
  Trip,
  'name' | 'routeId' | 'routeName' | 'distanceKm' | 'startAt' | 'vehicle' | 'maxMembers' | 'isPublic' | 'note' | 'coverImage'
> & {
  invitedUserIds: string[];
};

/** Sự kiện phát sinh khi đi trip (dùng cho Simulation / timeline). */
export type TripEvent =
  | { type: 'CHECKPOINT'; at: number; stopoverId: string }
  | { type: 'OFF_ROUTE'; at: number; userId: string; distanceM: number }
  | { type: 'REGROUP'; at: number; userId: string; distanceKm: number }
  | { type: 'LOST_SIGNAL'; at: number; userId: string; position: LatLng }
  | { type: 'SOS'; at: number; userId: string; position: LatLng };

export type SimSpeed = 1 | 5 | 10 | 50;

/** State của phiên giả lập chuyến đi. */
export interface SimulationState {
  tripId: string | null;
  running: boolean;
  speedMultiplier: SimSpeed;
  /** Quãng đường đã đi (km) */
  traveledKm: number;
  currentPosition: LatLng | null;
  currentSpeedKmh: number;
  events: TripEvent[];
}
