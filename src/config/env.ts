/**
 * env.ts — Cấu hình runtime đọc từ biến EXPO_PUBLIC_*.
 *
 * USE_MOCK = true  → mọi service trả MOCK DATA (backend chưa xong).
 * USE_MOCK = false → service gọi API thật qua axios.
 *
 * Chỉ bật mock khi EXPO_PUBLIC_USE_MOCK=true. Các giá trị khác (kể cả false) đều gọi API thật.
 */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.162:8080/v1';

export const GOONG_MAP_KEY: string =
  process.env.EXPO_PUBLIC_GOONG_MAP_KEY || '';

export const PLAYGROUND_KEY: string =
  process.env.EXPO_PUBLIC_PLAYGROUND_KEY || '';
