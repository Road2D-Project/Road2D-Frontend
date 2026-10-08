/**
 * authService.ts
 * API calls cho toàn bộ auth flow:
 *   - Username/password login
 *   - Phone check, OTP send/verify, register by phone
 *   - Refresh token, logout, forget/reset password
 *
 * NOTE: Phone/OTP endpoints là MOCK — backend chưa implement.
 * Khi backend xong, chỉ cần xóa các hàm mock và bỏ comment các hàm real.
 */

import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { MOCK_CURRENT_USER } from '../../mocks/mockData';
import { delay } from '../../mocks/mockStore';

// ─── Request / Response types ────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    refresh_token: string;
  };
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface CheckPhoneResponse {
  /** true = SĐT đã đăng ký tài khoản, false = SĐT chưa có tài khoản */
  registered: boolean;
}

export interface RegisterByPhoneRequest {
  phone: string;
  otp: string;
  password: string;
  confirm_password: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const authService = {
  // --- Username / Password ---------------------------------------------------

  /**
   * Đăng nhập bằng username + password.
   * POST /auth/user/login
   */
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    if (USE_MOCK) {
      // MOCK: tài khoản nào cũng vào được, miễn mật khẩu >= 6 ký tự
      await delay(800);
      if (payload.password.length < 6) {
        throw { response: { status: 400, data: { message: 'Sai tên đăng nhập hoặc mật khẩu.' } } };
      }
      return { data: { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token' } };
    }
    // TODO BACKEND: POST /auth/user/login
    const response = await apiClient.post<LoginResponse>('/auth/user/login', payload);
    return response.data;
  },

  /**
   * Lấy thông tin user đang đăng nhập.
   * GET /auth/user/me  (Bearer token đính tự động qua interceptor)
   */
  getMe: async (): Promise<UserProfile> => {
    if (USE_MOCK) {
      await delay(300);
      return {
        id: MOCK_CURRENT_USER.id,
        username: MOCK_CURRENT_USER.username ?? 'ban.r2d',
        email: 'ban@road2d.app',
        created_at: new Date().toISOString(),
      };
    }
    // TODO BACKEND: GET /auth/user/me
    const response = await apiClient.get<UserProfile>('/auth/user/me');
    return response.data;
  },

  /**
   * Đăng xuất — revoke refresh token.
   * POST /auth/user/logout
   */
  logout: async (refreshToken: string): Promise<void> => {
    if (USE_MOCK) return;
    // TODO BACKEND: POST /auth/user/logout
    await apiClient.post('/auth/user/logout', { refresh_token: refreshToken });
  },

  /**
   * Refresh access token.
   * POST /auth/user/refresh
   */
  refreshToken: async (refreshToken: string): Promise<{ access_token: string }> => {
    if (USE_MOCK) return { access_token: 'mock_access_token' };
    // TODO BACKEND: POST /auth/user/refresh
    const response = await apiClient.post<{ access_token: string }>('/auth/user/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  /**
   * Quên mật khẩu — gửi mail reset link.
   * POST /auth/user/forget-password
   */
  forgetPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/user/forget-password', { email });
  },

  // --- Phone / OTP (MOCK — backend chưa implement) --------------------------

  /**
   * Kiểm tra SĐT đã đăng ký chưa.
   * [MOCK] Real endpoint: POST /auth/phone/check
   */
  checkPhone: async (_phone: string): Promise<CheckPhoneResponse> => {
    // MOCK: simulate network delay 800ms
    await new Promise((r) => setTimeout(r, 800));
    // MOCK logic: SĐT kết thúc bằng số chẵn → đã đăng ký
    const lastDigit = parseInt(_phone.slice(-1), 10);
    return { registered: lastDigit % 2 === 0 };
  },

  /**
   * Gửi OTP SMS tới SĐT.
   * [MOCK] Real endpoint: POST /auth/phone/send-otp
   */
  sendOtp: async (_phone: string): Promise<void> => {
    await new Promise((r) => setTimeout(r, 600));
    // MOCK: luôn thành công
  },

  /**
   * Xác thực OTP.
   * [MOCK] Real endpoint: POST /auth/phone/verify-otp
   * Returns tokens nếu đây là login flow (đã có tài khoản)
   */
  verifyOtpAndLogin: async (
    _phone: string,
    otp: string,
  ): Promise<LoginResponse> => {
    await new Promise((r) => setTimeout(r, 700));
    if (otp !== '123456') {
      throw { response: { status: 400, data: { message: 'Mã OTP không đúng. Thử lại.' } } };
    }
    return { data: { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token' } };
  },

  /**
   * Đăng nhập bằng SĐT + mật khẩu (sau khi đã confirm SĐT đã đăng ký).
   * [MOCK] Real endpoint: POST /auth/phone/login
   */
  loginByPhone: async (
    _phone: string,
    _password: string,
  ): Promise<LoginResponse> => {
    await new Promise((r) => setTimeout(r, 800));
    if (_password.length < 6) {
      throw { response: { status: 400, data: { message: 'Mật khẩu không đúng.' } } };
    }
    return { data: { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token' } };
  },

  /**
   * Đăng ký tài khoản mới bằng SĐT (sau OTP).
   * [MOCK] Real endpoint: POST /auth/phone/register
   */
  registerByPhone: async (_payload: RegisterByPhoneRequest): Promise<LoginResponse> => {
    await new Promise((r) => setTimeout(r, 900));
    return { data: { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token' } };
  },
};

export default authService;
