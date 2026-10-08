import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import tokenStorage from '../storage/tokenStorage';
import { useAuthStore } from '../../store/useAuthStore';
import { useTripStore } from '../../store/useTripStore';
import { API_BASE_URL, USE_MOCK } from '../../config/env';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response interceptor: 401 → refresh token → retry, fail → logout ───────
//
// Chỉ có tác dụng khi gọi API thật (USE_MOCK=false). Service mock không đi qua axios
// nên không bao giờ kích hoạt đoạn này.
//
// TODO BACKEND: xác nhận endpoint refresh (/auth/user/refresh) và shape response
// { access_token } — đang theo authService.refreshToken.

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
/** Các request gặp 401 trong lúc đang refresh sẽ xếp hàng chờ token mới. */
let waiters: Array<(token: string | null) => void> = [];

const flushWaiters = (token: string | null) => {
  waiters.forEach((cb) => cb(token));
  waiters = [];
};

/** Xoá toàn bộ phiên đăng nhập → AppNavigator (auth guard) sẽ đưa về Login. */
const forceLogout = async () => {
  await tokenStorage.clearTokens();
  useAuthStore.getState().logout();
  useTripStore.getState().reset();
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;

    if (USE_MOCK || error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }
    // Không refresh cho chính các endpoint auth (tránh vòng lặp)
    if (original.url?.includes('/auth/user/login') || original.url?.includes('/auth/user/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    // Đang có request khác refresh → chờ kết quả rồi retry
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waiters.push((token) => {
          if (!token) return reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(original));
        });
      });
    }

    isRefreshing = true;
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw new Error('NO_REFRESH_TOKEN');

      // Dùng axios thuần (không qua apiClient) để tránh interceptor lặp.
      const res = await axios.post<{ access_token: string }>(
        `${API_BASE_URL}/auth/user/refresh`,
        { refresh_token: refreshToken },
      );
      const newAccess = res.data.access_token;
      await tokenStorage.saveTokens(newAccess, refreshToken);

      flushWaiters(newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return apiClient(original);
    } catch (refreshErr) {
      flushWaiters(null);
      await forceLogout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export { forceLogout };
export default apiClient;
