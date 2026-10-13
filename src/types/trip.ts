/**
 * trip.ts — Domain types cho Trip, thành viên, sự kiện trong chuyến đi.
 * Đã đồng bộ với schema Road2D-Backend (module/trip/model & utils/enum).
 */
import type { LatLng, PreviewLocationsResponse } from './route';

/** Enum trạng thái chuyến đi ở Backend (utils/enum/TripStatus.go) */
export type BackendTripStatus = 'planning' | 'locked';

/** Trạng thái chuyến đi ở Frontend */
export type TripStatus =
  | 'PLANNING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LOCKED'
  | 'planning'
  | 'active'
  | 'locked'
  | 'completed'
  | 'cancelled';

/** Vai trò hệ thống / phân quyền quản trị của thành viên (utils/enum/TripRole.go) */
export type BackendTripRole = 'leader' | 'member' | 'admin';

/** Vai trò vị trí di chuyển trong đoàn xe khi đi phượt */
export type TripRole =
  | 'LEADER'
  | 'SWEEPER'
  | 'RIDER'
  | 'PILLION'
  | 'CAR'
  | 'leader'
  | 'member'
  | 'admin';

/** Subscription Tier của chuyến đi (utils/enum/TripType.go) */
export type TripType = 'bronze' | 'silver' | 'gold' | 'diamond';

/** Vòng đời thành viên trong nhóm / chuyến đi (utils/enum/MembershipStatus.go) */
export type MembershipStatus =
  | 'invited'
  | 'pending'
  | 'active'
  | 'rejected'
  | 'left'
  | 'kicked';

/** Phương tiện di chuyển (utils/enum/Vehicle.go) */
export type BackendVehicle = 'bike' | 'car' | 'truck' | 'taxi' | 'hd';
export type VehicleType = 'Xe đạp' | 'Xe máy' | 'Ô tô' | BackendVehicle;

/** Trạng thái thành viên khi đang đi (khớp với STATUS_COLORS của LiveTracking). */
export type MemberStatus = 'normal' | 'lost' | 'no_signal' | 'lost_and_no_signal';

/** Trạng thái lái xe realtime (utils/enum/DriveStatus.go) */
export type DriveStatus = 'ON_ROUTE' | 'DEVIATED' | 'STOP' | 'EMERGENCY';

/** Trạng thái kết nối realtime (utils/enum/ConnectionStatus.go) */
export type ConnectionStatus = 'CONNECTING' | 'UNSTABLE' | 'DISCONNECTED' | 'RECONNECTING';

export interface TripMember {
  userId: string;
  name: string;
  avatar: string;
  role: TripRole;
  nickname?: string;
  status?: MembershipStatus;
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
  tripType?: TripType;
  /** ISO string */
  startAt: string;
  endTime?: string;
  vehicle: VehicleType;
  maxMembers: number;
  isPublic: boolean;
  note?: string;
  inviteCode: string;
  leaderId: string;
  members: TripMember[];
  coverImage?: string;
  myRole?: BackendTripRole;
  createdAt?: string;
  updatedAt?: string;
}

/** Khớp với DTO Backend TripResponse (module/trip/model/response/TripResponse.go) */
export interface BackendTripResponse {
  id: string;
  ownerId: string;
  name: string;
  status: BackendTripStatus;
  tripType: TripType;
  memberLimit: number;
  visibility: boolean;
  startTime?: string;
  endTime?: string;
  totalDistance: number;
  note: string;
  myRole?: BackendTripRole;
  createdTime: string;
  updatedTime: string;
}

/** Khớp với DTO Backend TripMemberResponse (module/trip/model/response/TripMemberResponse.go) */
export interface BackendTripMemberResponse {
  tripId: string;
  tripName?: string;
  userId: string;
  username?: string;
  assignedBranchId?: string;
  nickname: string;
  role: BackendTripRole;
  status: MembershipStatus;
  invitorName?: string;
  joinedAt?: string;
}

/** Khớp với DTO Backend CreateTripRequest (module/trip/model/request/CreateTripRequest.go) */
export interface BackendCreateTripRequest {
  name: string;
  note: string;
  startTime?: string;
  endTime?: string;
  tripType: TripType;
  visibility: boolean;
  memberUserIds: string[];
  mainBranch?: PreviewLocationsResponse;
}

/** Dữ liệu form tạo trip (chưa có id/inviteCode — do service sinh ra). */
export type CreateTripPayload = Pick<
  Trip,
  'name' | 'routeId' | 'routeName' | 'distanceKm' | 'startAt' | 'vehicle' | 'maxMembers' | 'isPublic' | 'note' | 'coverImage'
> & {
  tripType?: TripType;
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
