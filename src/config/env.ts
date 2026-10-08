/**
 * env.ts — Cấu hình runtime đọc từ biến EXPO_PUBLIC_*.
 *
 * USE_MOCK = true  → mọi service trả MOCK DATA (backend chưa xong).
 * USE_MOCK = false → service gọi API thật qua axios.
 *
 * Mặc định BẬT mock. Khi backend sẵn sàng: đặt EXPO_PUBLIC_USE_MOCK=false trong .env.local.
 */
export const USE_MOCK: boolean = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
