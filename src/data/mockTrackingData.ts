// ============================================================
// 🚨 MOCK DATA — CHỈ DÙNG ĐỂ DEMO, XOÁ SAU KHI CÓ BACKEND
// File: src/data/mockTrackingData.ts
// ============================================================

export type MemberStatus = 'normal' | 'lost' | 'no_signal' | 'lost_and_no_signal';

export interface TrackingMember {
  id: string;
  name: string;
  avatar: string;
  role: 'leader' | 'member' | 'sweeper';
  status: MemberStatus;
  /** GPS position trên bản đồ — [longitude, latitude] — chuẩn GeoJSON */
  lngLat: [number, number];
  /** Tốc độ hiện tại (km/h), null nếu mất sóng */
  speed: number | null;
  /** % pin điện thoại */
  battery: number | null;
  /** Khoảng cách so với leader (km) */
  distanceToLeader: number;
  /** Cường độ tín hiệu 0-4 bar, null nếu mất sóng */
  signal: number | null;
  /** Mô tả vị trí ngắn */
  locationDesc: string;
}

export interface Waypoint {
  id: string;
  name: string;
  lngLat: [number, number];
  distanceFromStart: number; // km
  type: 'start' | 'stop' | 'checkpoint' | 'end';
}

export interface MockTripData {
  tripName: string;
  day: number;
  totalDistance: number;
  completedDistance: number;
  nextStop: {
    name: string;
    distanceKm: number;
    weather: string;
    tempCelsius: number;
    weatherCondition: 'sunny' | 'cloudy' | 'rain' | 'fog';
  };
  members: TrackingMember[];
  waypoints: Waypoint[];
  /** Encoded polyline của tuyến đường Hà Giang → Đèo Mã Pì Lèng */
  routePolylineCoords: [number, number][];
  mapCenter: [number, number];
  mapZoom: number;
}

// ------------------------------------------------------------------
// Tuyến: Thị xã Hà Giang → Quản Bạ → Yên Minh → Đồng Văn → Mèo Vạc
// (Đoàn đang ở khoảng km 135, tiếp theo là Đèo Mã Pì Lèng)
// Toạ độ thực tế trên OpenStreetMap
// ------------------------------------------------------------------
export const MOCK_TRIP: MockTripData = {
  tripName: 'Hà Giang Loop',
  day: 2,
  totalDistance: 285,
  completedDistance: 135,

  nextStop: {
    name: 'Đèo Mã Pì Lèng',
    distanceKm: 12,
    weather: 'Có mây',
    tempCelsius: 22,
    weatherCondition: 'cloudy',
  },

  mapCenter: [105.3315, 23.2565], // Giữa đoạn Đồng Văn - Mèo Vạc
  mapZoom: 12,

  // Polyline thủ công theo đường thực tế (đã kiểm tra trên map)
  routePolylineCoords: [
    [104.9832, 22.8237], // Hà Giang city
    [105.0021, 22.8512],
    [105.0540, 22.9231],
    [105.0901, 23.0218], // Cổng Trời Quản Bạ
    [105.1430, 23.0892],
    [105.2011, 23.1500], // Yên Minh
    [105.2634, 23.1978],
    [105.3102, 23.2340],
    [105.3315, 23.2565], // Đồng Văn
    [105.3680, 23.2721],
    [105.3998, 23.3012], // Đèo Mã Pì Lèng
    [105.4521, 23.3302], // Mèo Vạc
  ],

  waypoints: [
    { id: 'w1', name: 'Hà Giang', lngLat: [104.9832, 22.8237], distanceFromStart: 0, type: 'start' },
    { id: 'w2', name: 'Cổng Trời Quản Bạ', lngLat: [105.0901, 23.0218], distanceFromStart: 46, type: 'checkpoint' },
    { id: 'w3', name: 'Yên Minh', lngLat: [105.2011, 23.1500], distanceFromStart: 85, type: 'stop' },
    { id: 'w4', name: 'Đồng Văn', lngLat: [105.3315, 23.2565], distanceFromStart: 130, type: 'stop' },
    { id: 'w5', name: 'Đèo Mã Pì Lèng', lngLat: [105.3998, 23.3012], distanceFromStart: 147, type: 'checkpoint' },
    { id: 'w6', name: 'Mèo Vạc', lngLat: [105.4521, 23.3302], distanceFromStart: 165, type: 'end' },
  ],

  members: [
    // ✅ LEADER — Bình thường
    {
      id: 'm1',
      name: 'Gia Minh',
      avatar: 'https://cdn.myanimelist.net/images/characters/16/512998.jpg',
      role: 'leader',
      status: 'normal',
      lngLat: [105.3680, 23.2721],
      speed: 45,
      battery: 85,
      distanceToLeader: 0,
      signal: 3,
      locationDesc: 'Dẫn đoàn',
    },
    // ✅ Bạn — Bình thường
    {
      id: 'm2',
      name: 'Bạn',
      avatar: 'https://cdn.myanimelist.net/images/characters/11/308347.jpg',
      role: 'member',
      status: 'normal',
      lngLat: [105.3643, 23.2705],
      speed: 43,
      battery: 92,
      distanceToLeader: 0.8,
      signal: 4,
      locationDesc: 'Giữa đoàn',
    },
    // ✅ Thành viên 3 — Bình thường
    {
      id: 'm3',
      name: 'Tấn Đạt',
      avatar: 'https://cdn.myanimelist.net/images/characters/4/308335.jpg',
      role: 'member',
      status: 'normal',
      lngLat: [105.3607, 23.2689],
      speed: 44,
      battery: 71,
      distanceToLeader: 1.2,
      signal: 3,
      locationDesc: 'Giữa đoàn',
    },
    // ✅ Thành viên 4 — Bình thường
    {
      id: 'm4',
      name: 'Xuân Dung',
      avatar: 'https://cdn.myanimelist.net/images/characters/3/146129.jpg',
      role: 'member',
      status: 'normal',
      lngLat: [105.3570, 23.2674],
      speed: 42,
      battery: 60,
      distanceToLeader: 1.8,
      signal: 2,
      locationDesc: 'Giữa đoàn',
    },
    // ✅ Thành viên 5 — Bình thường
    {
      id: 'm5',
      name: 'Hoàng Nam',
      avatar: 'https://cdn.myanimelist.net/images/characters/14/146141.jpg',
      role: 'member',
      status: 'normal',
      lngLat: [105.3534, 23.2658],
      speed: 41,
      battery: 55,
      distanceToLeader: 2.2,
      signal: 3,
      locationDesc: 'Giữa đoàn',
    },
    // ✅ Thành viên 6 — Bình thường
    {
      id: 'm6',
      name: 'Minh Trang',
      avatar: 'https://cdn.myanimelist.net/images/characters/12/238943.jpg',
      role: 'member',
      status: 'normal',
      lngLat: [105.3497, 23.2643],
      speed: 40,
      battery: 78,
      distanceToLeader: 2.8,
      signal: 2,
      locationDesc: 'Cuối đoàn',
    },
    // ✅ Thành viên 7 — Bình thường
    {
      id: 'm7',
      name: 'Quỳnh',
      avatar: 'https://cdn.myanimelist.net/images/characters/15/146211.jpg',
      role: 'sweeper',
      status: 'normal',
      lngLat: [105.3461, 23.2627],
      speed: 38,
      battery: 43,
      distanceToLeader: 3.1,
      signal: 1,
      locationDesc: 'Cuối đoàn',
    },
    // 🟠 Thành viên 8 — BỊ LẠC (lệch khỏi tuyến đường)
    {
      id: 'm8',
      name: 'Thanh Phương',
      avatar: 'https://cdn.myanimelist.net/images/characters/5/146209.jpg',
      role: 'sweeper',
      status: 'lost',
      lngLat: [105.3500, 23.2500], // Lệch khỏi tuyến ~2km
      speed: 15,
      battery: 38,
      distanceToLeader: 5.2,
      signal: 2,
      locationDesc: 'Lệch tuyến 1.8km',
    },
    // ⚫ Thành viên 9 — MẤT SÓNG
    {
      id: 'm9',
      name: 'Thảo Vy',
      avatar: 'https://cdn.myanimelist.net/images/characters/6/146131.jpg',
      role: 'member',
      status: 'no_signal',
      lngLat: [105.3424, 23.2611], // Vị trí lần cuối có sóng
      speed: null,
      battery: null,
      distanceToLeader: 4.0,
      signal: null,
      locationDesc: 'Mất sóng 3 phút trước',
    },
    // 🔴 Thành viên 10 — LẠC + MẤT SÓNG (nghiêm trọng nhất)
    {
      id: 'm10',
      name: 'Đức Anh',
      avatar: 'https://cdn.myanimelist.net/images/characters/12/268105.jpg',
      role: 'member',
      status: 'lost_and_no_signal',
      lngLat: [105.3700, 23.2650], // Lệch khỏi tuyến + vị trí cũ
      speed: null,
      battery: null,
      distanceToLeader: 7.8,
      signal: null,
      locationDesc: 'Lệch tuyến và Mất sóng 8 phút',
    },
  ],
};

// Màu sắc tương ứng với từng trạng thái (dùng trong cả UI RN lẫn HTML map)
export const STATUS_COLORS: Record<MemberStatus, { bg: string; border: string; label: string; mapCircle: string }> = {
  normal: { bg: '#FFFFFF', border: '#FFFFFF', label: 'Bình thường', mapCircle: '#FFFFFF' },
  lost: { bg: 'rgba(255,152,0,0.12)', border: '#FF9800', label: 'Lạc tuyến', mapCircle: '#FF9800' },
  no_signal: { bg: 'rgba(100,100,100,0.10)', border: '#757575', label: 'Mất sóng', mapCircle: '#757575' },
  lost_and_no_signal: { bg: 'rgba(255,82,82,0.12)', border: '#FF5252', label: 'Lạc + Mất sóng', mapCircle: '#FF5252' },
};
