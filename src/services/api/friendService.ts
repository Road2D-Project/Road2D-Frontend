/**
 * friendService.ts
 * API service cho các chức năng bạn bè:
 * - Lấy danh sách bạn bè (GET /v1/friends)
 * - Tìm kiếm người dùng (GET /v1/friends/search)
 * - Quản lý lời mời kết bạn (GET/POST/DELETE /v1/friends/requests)
 * - Hủy kết bạn (DELETE /v1/friends/:userId)
 */

import apiClient from './index';
import { USE_MOCK } from '../../config/env';
import { delay } from '../../mocks/mockStore';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface FriendItem {
  userId: string;
  username: string;
  avatar?: string;
}

export interface FriendListResponse {
  count: number;
  friends: FriendItem[];
}

export type FriendRelation = 'none' | 'outgoing' | 'incoming' | 'friends';

export interface FriendSearchHit {
  userId: string;
  username: string;
  relation: FriendRelation;
  avatar?: string;
}

export interface FriendSearchResponse {
  users: FriendSearchHit[];
}

export interface FriendRequestItem {
  userId: string;
  username: string;
  status: 'pending' | 'active' | 'rejected';
}

export interface FriendRequestListResponse {
  count: number;
  requests: FriendRequestItem[];
}

// ─── Mock Fallback Data ──────────────────────────────────────────────────────

const MOCK_FRIENDS_DATA: FriendItem[] = [
  { userId: 'f1000000-0000-0000-0000-000000000001', username: 'tuan.dat' },
  { userId: 'f1000000-0000-0000-0000-000000000002', username: 'thu.ha' },
  { userId: 'f1000000-0000-0000-0000-000000000003', username: 'minh.trang' },
  { userId: 'f1000000-0000-0000-0000-000000000004', username: 'hoai.nam' },
];

// ─── Service ─────────────────────────────────────────────────────────────────

const friendService = {
  /**
   * Lấy danh sách bạn bè đã kết bạn.
   * GET /v1/friends?q=...
   */
  getFriends: async (query?: string): Promise<FriendListResponse> => {
    if (USE_MOCK) {
      await delay(400);
      const filtered = query
        ? MOCK_FRIENDS_DATA.filter((f) => f.username.toLowerCase().includes(query.toLowerCase()))
        : MOCK_FRIENDS_DATA;
      return { count: filtered.length, friends: filtered };
    }
    const params = query ? { q: query.trim() } : {};
    const res = await apiClient.get<FriendListResponse>('/friends', { params });
    return res.data;
  },

  /**
   * Tìm kiếm người dùng theo username hoặc số điện thoại.
   * GET /v1/friends/search?q=...
   */
  searchUsers: async (query: string): Promise<FriendSearchResponse> => {
    if (USE_MOCK) {
      await delay(400);
      return {
        users: [
          { userId: 'u1', username: query, relation: 'none' },
        ],
      };
    }
    const res = await apiClient.get<FriendSearchResponse>('/friends/search', {
      params: { q: query.trim() },
    });
    return res.data;
  },

  /**
   * Lấy danh sách lời mời kết bạn (box = 'in' | 'out').
   * GET /v1/friends/requests?box=...
   */
  getFriendRequests: async (box: 'in' | 'out' = 'in'): Promise<FriendRequestListResponse> => {
    if (USE_MOCK) {
      await delay(300);
      return { count: 0, requests: [] };
    }
    const res = await apiClient.get<FriendRequestListResponse>('/friends/requests', {
      params: { box },
    });
    return res.data;
  },

  /**
   * Gửi lời mời kết bạn.
   * POST /v1/friends/requests/:userId
   */
  sendFriendRequest: async (targetUserId: string): Promise<FriendRequestItem> => {
    if (USE_MOCK) {
      await delay(500);
      return { userId: targetUserId, username: 'mock.user', status: 'pending' };
    }
    const res = await apiClient.post<FriendRequestItem>(`/friends/requests/${targetUserId}`);
    return res.data;
  },

  /**
   * Phản hồi lời mời kết bạn (action: 'accept' | 'reject').
   * POST /v1/friends/requests/:userId/respond?action=...
   */
  respondFriendRequest: async (
    requesterUserId: string,
    action: 'accept' | 'reject'
  ): Promise<FriendRequestItem> => {
    if (USE_MOCK) {
      await delay(500);
      return { userId: requesterUserId, username: 'mock.user', status: action === 'accept' ? 'active' : 'rejected' };
    }
    const res = await apiClient.post<FriendRequestItem>(
      `/friends/requests/${requesterUserId}/respond`,
      null,
      { params: { action } }
    );
    return res.data;
  },

  /**
   * Hủy lời mời kết bạn đã gửi.
   * DELETE /v1/friends/requests/:userId
   */
  cancelFriendRequest: async (targetUserId: string): Promise<void> => {
    if (USE_MOCK) {
      await delay(300);
      return;
    }
    await apiClient.delete(`/friends/requests/${targetUserId}`);
  },

  /**
   * Hủy kết bạn (Unfriend).
   * DELETE /v1/friends/:userId
   */
  unfriend: async (targetUserId: string): Promise<void> => {
    if (USE_MOCK) {
      await delay(300);
      return;
    }
    await apiClient.delete(`/friends/${targetUserId}`);
  },
};

export default friendService;
