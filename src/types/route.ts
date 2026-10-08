/**
 * route.ts — Domain types cho tuyến đường (Route), điểm dừng (Stopover), toạ độ.
 */

/** Toạ độ theo chuẩn react-native-maps. */
export interface LatLng {
  latitude: number;
  longitude: number;
}

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXTREME';

export type StopoverType = 'start' | 'stop' | 'checkpoint' | 'end';

/** Điểm dừng / checkpoint trên tuyến. */
export interface Stopover {
  id: string;
  name: string;
  /** [longitude, latitude] — chuẩn GeoJSON, khớp với data đang dùng cho Goong WebView */
  lngLat: [number, number];
  distanceFromStart: number; // km
  type: StopoverType;
  /** Thời gian dừng dự kiến (phút) */
  stayMinutes?: number;
}

export interface Route {
  id: string;
  name: string;
  distanceKm: number;
  difficulty: DifficultyLevel;
  coverImage: string;
  stopovers: Stopover[];
  /** Polyline [lng, lat][] của cả tuyến */
  polyline: [number, number][];
}
