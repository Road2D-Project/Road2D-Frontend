/**
 * mockData.ts — DỮ LIỆU GIẢ để test FE khi backend chưa xong.
 * 🚨 Xoá file này (và nhánh USE_MOCK trong service) khi backend hoàn thiện.
 */
import type { Route, Trip, User } from '../types';
import { MOCK_TRIP } from '../data/mockTrackingData';

export const MOCK_CURRENT_USER: User = {
  id: 'u_me',
  name: 'Bạn',
  phone: '0900000000',
  username: 'ban.r2d',
  avatar: 'https://cdn.myanimelist.net/images/characters/11/308347.jpg',
};

export const MOCK_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Hà Giang Loop',
    distanceKm: 350,
    difficulty: 'HARD',
    coverImage: 'https://images.unsplash.com/photo-1599423423926-17b5db30303a?q=80&w=400',
    stopovers: MOCK_TRIP.waypoints,
    polyline: MOCK_TRIP.routePolylineCoords,
  },
  {
    id: 'r2',
    name: 'Tà Xùa Săn Mây',
    distanceKm: 285,
    difficulty: 'MEDIUM',
    coverImage: 'https://images.unsplash.com/photo-1596704153831-fbf22d4f58c7?q=80&w=400',
    stopovers: [],
    polyline: [],
  },
  {
    id: 'r3',
    name: 'Trảng Bom — Đà Lạt',
    distanceKm: 300,
    difficulty: 'MEDIUM',
    coverImage: 'https://images.unsplash.com/photo-1519098901909-b1553a1190af?q=80&w=400',
    stopovers: [],
    polyline: [],
  },
  {
    id: 'r4',
    name: 'Cung Đường Tây Bắc',
    distanceKm: 850,
    difficulty: 'EXTREME',
    coverImage: 'https://images.unsplash.com/photo-1549880181-56a44cf4a9a5?q=80&w=400',
    stopovers: [],
    polyline: [],
  },
];

export const MOCK_FRIENDS = [
  { id: 'f1', name: 'Tuấn Đạt', username: '@tuan.dat', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100' },
  { id: 'f2', name: 'Thu Hà', username: '@thu.ha', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100' },
  { id: 'f3', name: 'Minh Trang', username: '@minh.trang', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=100' },
  { id: 'f4', name: 'Hoài Nam', username: '@hoai.nam', avatar: 'https://images.unsplash.com/photo-1543610892-0b1f7e6d8ac1?q=80&w=100' },
  { id: 'f5', name: 'Thanh Trúc', username: '@thanh.truc', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=100' },
  { id: 'f6', name: 'Bảo Long', username: '@bao.long', avatar: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=100' },
];

/** Trip đang diễn ra — khớp với MOCK_TRIP của LiveTracking. */
export const MOCK_ACTIVE_TRIP_ID = 'trip_hagiang_01';

export const MOCK_TRIPS: Trip[] = [
  {
    id: MOCK_ACTIVE_TRIP_ID,
    name: 'Hà Giang Loop',
    routeId: 'r1',
    routeName: 'Hà Giang Loop',
    distanceKm: 350,
    status: 'ACTIVE',
    startAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    vehicle: 'Xe máy',
    maxMembers: 15,
    isPublic: true,
    inviteCode: 'R2D-HG001',
    leaderId: 'u_leader',
    members: MOCK_TRIP.members.map((m) => ({
      userId: m.id,
      name: m.name,
      avatar: m.avatar,
      role: m.role === 'leader' ? 'LEADER' : m.role === 'sweeper' ? 'SWEEPER' : 'RIDER',
      accepted: true,
    })),
  },
  {
    id: 'trip_taxua_02',
    name: 'Tà Xùa tháng 12',
    routeId: 'r2',
    routeName: 'Tà Xùa Săn Mây',
    distanceKm: 285,
    status: 'PLANNING',
    startAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    vehicle: 'Xe máy',
    maxMembers: 10,
    isPublic: false,
    inviteCode: 'R2D-TX002',
    leaderId: 'u_me',
    members: [
      { userId: 'u_me', name: 'Bạn', avatar: MOCK_CURRENT_USER.avatar ?? '', role: 'LEADER', accepted: true },
    ],
  },
];
